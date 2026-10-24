import Foundation

/// 随驾·副驾共享态：广播扩展写，App 与键盘读。
/// 全程本机 OCR；只有点「分析」那一刻，文本才发往你自己配置的模型（隐私边界与 jev-jarvis 一致）。
struct ConvMessage: Codable, Equatable {
    var side: String          // "them" = 对方(左气泡) | "me" = 我(右气泡)
    var text: String
    var ts: TimeInterval
}

struct ConvoState: Codable, Equatable {
    var live: Bool = false
    var messages: [ConvMessage] = []
    var updatedAt: TimeInterval = 0
    var frames: Int = 0       // 有效 OCR 帧数（诊断用）
}

enum SuiJiaStore {
    static let groupID = "group.com.wuqingjun.jarvis.ios"
    static let fileName = "suijia_convo.json"
    static let maxMessages = 200

    static var fileURL: URL? {
        guard let base = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) else { return nil }
        return base.appendingPathComponent(fileName)
    }

    static func load() -> ConvoState {
        guard let url = fileURL, let data = try? Data(contentsOf: url),
              let st = try? JSONDecoder().decode(ConvoState.self, from: data) else { return ConvoState() }
        return st
    }

    static func save(_ st: ConvoState) {
        guard let url = fileURL else { return }
        var s = st
        if s.messages.count > maxMessages { s.messages = Array(s.messages.suffix(maxMessages)) }
        s.updatedAt = Date().timeIntervalSince1970
        if let data = try? JSONEncoder().encode(s) {
            try? data.write(to: url, options: .atomic)
        }
    }

    /// 给模型看的上下文：最近 N 条，「对方/我」前缀。
    static func contextString(_ st: ConvoState, limit: Int = 30) -> String? {
        let msgs = st.messages.suffix(limit)
        guard !msgs.isEmpty else { return nil }
        let lines = msgs.map { m -> String in
            let who = m.side == "them" ? "对方" : "我"
            return "\(who)：\(m.text)"
        }
        return "以下是本场对话的最近上下文（副驾自动读取）：\n" + lines.joined(separator: "\n")
    }
}
