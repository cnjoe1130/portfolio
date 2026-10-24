#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
吃了么 · 周复盘卡（无LLM纯脚本，cron --script 模式用）
原则：素材只来自用户自己的历史日志；句式只做自我对比，不规训。
输出 markdown 卡片到 stdout。
"""
import json, glob, os, sys
from datetime import datetime, timedelta, timezone

PKG = os.path.expanduser("~/Desktop/chileme-latest/chileme-package")
DATA = os.path.join(PKG, "data")
CST = timezone(timedelta(hours=8))

def load_all():
    days = []           # [(date, meals_dict_or_list, total)]
    weights = {}        # {date: value} 去重取后写
    target = None       # 最近见过的 targetKcal
    profile_weight = None
    for fp in sorted(glob.glob(os.path.join(DATA, "20*.json"))):
        name = os.path.basename(fp)[:-5]
        if not (len(name) == 10 and name[4] == "-"): continue
        try:
            d = json.loads(open(fp, encoding="utf-8").read())
        except Exception:
            continue
        meals = d.get("meals", [])
        items = []
        if isinstance(meals, dict):
            for slot, arr in meals.items():
                if isinstance(arr, list):
                    for it in arr: it = dict(it); it["_slot"] = slot; items.append(it)
        elif isinstance(meals, list):
            for it in meals: it = dict(it); it["_slot"] = it.get("meal", "snack"); items.append(it)
        days.append((name, items))
        for w in d.get("weights") or []:
            if isinstance(w, dict) and w.get("date") and w.get("value"):
                weights[w["date"]] = float(w["value"])
        if d.get("target"): target = float(d["target"])
        prof = d.get("profile") or {}
        if prof.get("targetKcal"): target = float(prof["targetKcal"])
        if prof.get("weight"): profile_weight = float(prof["weight"])
    return days, weights, target, profile_weight

def day_kcal_macros(items):
    kcal = sum(i.get("kcal", 0) or 0 for i in items)
    p = sum((i.get("protein") or 0) for i in items)
    return kcal, p

def fmt(x, nd=0):
    return f"{x:.{nd}f}"

def main():
    days, weights, target, profile_weight = load_all()
    if not days:
        print("本周无记录。"); return
    today = datetime.now(CST).date()
    last7 = [d for d in days if (today - datetime.strptime(d[0], "%Y-%m-%d").date()).days < 7]
    last30 = [d for d in days if (today - datetime.strptime(d[0], "%Y-%m-%d").date()).days < 30]
    if not last7:
        print(f"近7天无记录（最近记录：{days[-1][0]}）。"); return

    logged = [(dt, items) for dt, items in last7]
    kcal_list, p_list = zip(*[day_kcal_macros(it) for _, it in logged])
    mean_kcal = sum(kcal_list) / len(kcal_list)
    mean_p = sum(p_list) / len(p_list)
    tgt = target or 1508.0

    L = []
    L.append("## 📋 吃了么 · 周复盘")
    L.append(f"**记录 {len(logged)}/7 天** · 日均 **{fmt(mean_kcal)}** kcal（目标 {fmt(tgt)}，"
             f"{'达标 ✅' if mean_kcal <= tgt * 1.05 else '超出 ' + fmt(mean_kcal - tgt) + ' kcal'}）")

    # ── 体重与TDEE反推（数据不足则如实说明，不编造）──
    wpts = sorted((dt, v) for dt, v in weights.items()
                  if (today - datetime.strptime(dt, "%Y-%m-%d").date()).days <= 21)
    if len(wpts) >= 2:
        (d1, v1), (d2, v2) = wpts[0], wpts[-1]
        span = max((datetime.strptime(d2, "%Y-%m-%d").date() - datetime.strptime(d1, "%Y-%m-%d").date()).days, 1)
        dw = v2 - v1
        slope_per_week = dw / span * 7
        implied = mean_kcal - slope_per_week * 7700
        L.append(f"**体重**：{v1} → {v2} kg（{span}天 {dw:+.1f}，周斜率 {slope_per_week:+.2f}）")
        L.append(f"**反推真实TDEE ≈ {fmt(implied)}** kcal（摄入均值 + 体重变化折算）")
        L.append(f"下周参考目标：**{fmt(implied - 400 if slope_per_week > 0.05 else implied)}** kcal"
                 f"（{'当前斜率偏增' if slope_per_week > 0.05 else '当前斜率方向符合减重'}）")
    else:
        last_w = max(weights.items(), key=lambda kv: kv[0]) if weights else None
        if last_w:
            age = (today - datetime.strptime(last_w[0], "%Y-%m-%d").date()).days
            L.append(f"**体重**：最近记录 {last_w[1]} kg（{last_w[0]}，{age}天前）— 近21天不足2次，"
                     "TDEE反推暂停。**连续晨重3天即可恢复自校准**")
        else:
            L.append("**体重**：尚无记录 — 连续晨重3天（晨起空腹）即可开启 TDEE 自校准")

    # ── 蛋白：只摆差距和你自己的高蛋白库存 ──
    wk = profile_weight or (wpts[-1][1] if wpts else None)
    if wk:
        p_goal = wk * 1.5
        # 覆盖感知：只统计有蛋白字段的天，避免老日志缺字段按0稀释
        p_days = [(dt, day_kcal_macros(it)[1]) for dt, it in logged if any(i.get("protein") for i in it)]
        if p_days:
            p_mean_cov = sum(v for _, v in p_days) / len(p_days)
            cov_note = f"（有蛋白数据 {len(p_days)}/{len(logged)} 天的均值）" if len(p_days) < len(logged) else ""
            gap = p_goal - p_mean_cov
            L.append(f"**蛋白质**：日均 {fmt(p_mean_cov)}g{cov_note} vs 推荐 {fmt(p_goal)}g（1.5g/kg × {fmt(wk,1)}kg）"
                     + (f"，差 {fmt(gap)}g/日" if gap > 0 else "，达标"))
        else:
            gap = p_goal
            L.append(f"**蛋白质**：近7天日志无蛋白字段 — 补录后可按体重校准（推荐 {fmt(p_goal)}g）")
        if gap > 0:
            # 从近30天自己的日志里找蛋白密度最高的食材
            best = {}
            for dt, items in last30:
                for it in items:
                    g = it.get("g") or (it.get("amount") if it.get("unit_name") == "g" else None)
                    pr = it.get("protein")
                    if g and pr and g >= 30 and pr / g * 100 >= 8:
                        name, dens, kc = it["name"], pr / g * 100, (it.get("kcal", 0) or 0) / g * 100
                        if name not in best or dens > best[name][1]:
                            best[name] = (dens, kc, g)
            top = sorted(best.items(), key=lambda kv: -kv[1][0])[:3]
            if top:
                L.append("  你近30天吃过的蛋白密度前3（每100g）：")
                for n, (dens, kc, g) in top:
                    L.append(f"  · {n}：蛋白 {fmt(dens)}g / {fmt(kc)} kcal")
    else:
        L.append(f"**蛋白质**：日均 {fmt(mean_p)}g（补晨重后可按体重校准目标）")

    # ── 加餐自我对比：只摆数字，不下指令 ──
    flat = [it for _, items in logged for it in items]
    snacks7 = [it for it in flat if it.get("_slot") == "snack"]
    if snacks7:
        dens = {}
        for it in snacks7:
            g = it.get("g") or (it.get("amount") if it.get("unit_name") in ("g", "ml") else None)
            if g and it.get("kcal") and g >= 10:
                k100 = it.get("k100") or it["kcal"] / g * 100
                dens.setdefault(it["name"], k100)
        if len(dens) >= 2:
            srt = sorted(dens.items(), key=lambda kv: kv[1])
            lo, hi = srt[0], srt[-1]
            if hi[1] / max(lo[1], 1) >= 1.8:
                L.append(f"**加餐密度对比（本周你自己的选择）**：{lo[0]} {fmt(lo[1])}/100g "
                         f"vs {hi[0]} {fmt(hi[1])}/100g — 同为加餐，密度差 {fmt(hi[1]/lo[1],1)} 倍")

    L.append(f"\n*数据源：本地 {len(days)} 天日志 · 生成于 {today} · 无评价只有数据*")
    print("\n".join(L))

if __name__ == "__main__":
    main()
