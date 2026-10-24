import ReplayKit
import Vision
import CoreMedia
import CoreVideo

/// 随驾·副驾核心：屏幕广播帧 → 本机 OCR → 气泡归属（左右）→ 增量写入 App Group。
/// 内存纪律（扩展 ~50MB 红线）：帧 digest 没变不跑 OCR、0.6s 节流、autoreleasepool 包住每帧、不持有任何大对象。
final class SampleHandler: RPBroadcastSampleHandler {

    private var state = ConvoState()
    private var seen = Set<String>()       // "side|text" 去重窗口
    private var lastOCRTime: TimeInterval = 0
    private var lastDigest: UInt64 = 0
    private var busy = false

    private lazy var textRequest: VNRecognizeTextRequest = {
        let r = VNRecognizeTextRequest()
        r.recognitionLevel = .accurate
        r.recognitionLanguages = ["zh-Hans", "en-US"]
        r.usesLanguageCorrection = false
        r.minimumTextHeight = 0.010           // 相对图高；聊天小字也要抓
        return r
    }()

    override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
        state = SuiJiaStore.load()            // 接续上一场：对话是连续的
        state.live = true
        seen = Set(state.messages.map { $0.side + "|" + $0.text })
        SuiJiaStore.save(state)
    }

    override func broadcastFinished() {
        state.live = false
        SuiJiaStore.save(state)
    }

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleType: RPSampleBufferType) {
        guard sampleType == .video, !busy,
              let pb = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let now = Date().timeIntervalSince1970
        guard now - lastOCRTime > 0.6 else { return }         // 节流
        let digest = quickDigest(pb)
        guard digest != lastDigest else { return }            // 画面没变不烧 OCR
        lastDigest = digest
        lastOCRTime = now
        busy = true
        defer { busy = false }
        autoreleasepool { recognize(pb) }
    }

    // MARK: - 帧级 digest（32×32 步进亮度采样，FNV-1a）

    private func quickDigest(_ pb: CVPixelBuffer) -> UInt64 {
        CVPixelBufferLockBaseAddress(pb, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pb, .readOnly) }
        guard let base = CVPixelBufferGetBaseAddress(pb) else { return 0 }
        let w = CVPixelBufferGetWidth(pb), h = CVPixelBufferGetHeight(pb)
        let bpr = CVPixelBufferGetBytesPerRow(pb)
        let px = base.assumingMemoryBound(to: UInt8.self)
        let sx = max(1, w / 32), sy = max(1, h / 32)
        var hash: UInt64 = 14695981039346656037
        var y = 0
        while y < h {
            var x = 0
            while x < w {
                let o = y * bpr + x * 4          // BGRA
                let lum = (UInt32(px[o]) &+ (UInt32(px[o + 1]) << 1) &+ UInt32(px[o + 2])) >> 2
                hash = (hash ^ UInt64(lum & 0xFF)) &* 1099511628211
                x += sx
            }
            y += sy
        }
        return hash
    }

    // MARK: - OCR → 行 → 气泡 → 增量入库

    private struct Block { let text: String; let midX: CGFloat; let top: CGFloat; let bottom: CGFloat }

    private func recognize(_ pb: CVPixelBuffer) {
        let handler = VNImageRequestHandler(cvPixelBuffer: pb, orientation: .up, options: [:])
        try? handler.perform([textRequest])
        guard let results = textRequest.results, !results.isEmpty else { return }

        var blocks: [Block] = []
        for o in results {
            guard let cand = o.topCandidates(1).first, cand.confidence > 0.3 else { continue }
            let s = cand.string.trimmingCharacters(in: .whitespacesAndNewlines)
            guard s.count >= 2 else { continue }
            let bb = o.boundingBox
            // 居中的时间戳/系统提示（小而居中）跳过
            if abs(bb.midX - 0.5) < 0.08 && s.count <= 12 { continue }
            blocks.append(Block(text: s, midX: bb.midX, top: bb.maxY, bottom: bb.minY))
        }
        guard !blocks.isEmpty else { return }

        // Vision bbox 原点在左下：top 大 = 屏幕上方。按行聚类成气泡（同行距阈值内、同侧合并）。
        blocks.sort { $0.top > $1.top }
        let gapLimit: CGFloat = 0.020
        struct Bubble { var side: String; var lines: [String]; var bottom: CGFloat }
        var bubbles: [Bubble] = []
        for b in blocks {
            let side = b.midX < 0.5 ? "them" : "me"
            if let li = bubbles.indices.last, bubbles[li].side == side,
               (bubbles[li].bottom - b.top) < gapLimit {
                bubbles[li].lines.append(b.text)
                bubbles[li].bottom = min(bubbles[li].bottom, b.bottom)
            } else {
                bubbles.append(Bubble(side: side, lines: [b.text], bottom: b.bottom))
            }
        }

        // 增量：没见过的气泡按顺序追加
        var added = 0
        for b in bubbles {
            let text = b.lines.joined(separator: " ")
            let key = b.side + "|" + text
            guard !seen.contains(key) else { continue }
            seen.insert(key)
            state.messages.append(ConvMessage(side: b.side, text: text, ts: Date().timeIntervalSince1970))
            added += 1
        }
        guard added > 0 else { return }
        state.frames += 1
        SuiJiaStore.save(state)
    }
}
