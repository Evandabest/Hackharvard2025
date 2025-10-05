import Foundation
import Combine

class WebSocketManager: ObservableObject {
    @Published var connectionStatus: ConnectionStatus = .disconnected
    @Published var currentPhase: String = ""
    @Published var progress: Double = 0.0
    @Published var lastMessage: String = ""
    @Published var isComplete: Bool = false
    @Published var reportKey: String?
    @Published var summary: String?
    @Published var findingsCount: Int = 0
    @Published var error: String?
    
    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    
    enum ConnectionStatus {
        case disconnected
        case connecting
        case connected
        case error
    }
    
    func connect(to runId: String) {
        print("🔥🔥🔥 ORIGINAL WebSocketManager connect() called with runId: \(runId) 🔥🔥🔥")
        
        guard let url = URL(string: "wss://auditor-edge.evanhaque1.workers.dev/ws/run/\(runId)") else {
            print("❌ Invalid WebSocket URL")
            return
        }
        
        connectionStatus = .connecting
        print("🔄 ORIGINAL WebSocketManager: Connecting to WebSocket: \(url)")
        print("🔄 ORIGINAL WebSocketManager: Run ID: \(runId)")
        
        urlSession = URLSession(configuration: .default)
        webSocketTask = urlSession?.webSocketTask(with: url)
        print("🔄 ORIGINAL WebSocketManager: WebSocket task created: \(webSocketTask != nil)")
        
        webSocketTask?.resume()
        
        connectionStatus = .connected
        print("✅ ORIGINAL WebSocketManager: WebSocket connected")
        
        // Start listening for messages
        print("🔄 ORIGINAL WebSocketManager: Starting to receive messages...")
        receiveMessage()
    }
    
    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        urlSession = nil
        connectionStatus = .disconnected
        print("🔌 WebSocket disconnected")
    }
    
    private func receiveMessage() {
        print("🔄 ORIGINAL WebSocketManager: Starting to receive messages...")
        webSocketTask?.receive { [weak self] result in
            print("🔄 ORIGINAL WebSocketManager: Received result: \(result)")
            switch result {
            case .success(let message):
                print("✅ ORIGINAL WebSocketManager: Message received successfully")
                switch message {
                case .string(let text):
                    print("📝 ORIGINAL WebSocketManager: String message: \(text)")
                    self?.handleMessage(text)
                case .data(let data):
                    print("📦 ORIGINAL WebSocketManager: Data message: \(data.count) bytes")
                    if let text = String(data: data, encoding: .utf8) {
                        print("📝 ORIGINAL WebSocketManager: Data as string: \(text)")
                        self?.handleMessage(text)
                    }
                @unknown default:
                    print("❓ ORIGINAL WebSocketManager: Unknown message type")
                    break
                }
                
                // Continue listening
                print("🔄 ORIGINAL WebSocketManager: Continuing to listen for messages...")
                self?.receiveMessage()
                
            case .failure(let error):
                print("❌ ORIGINAL WebSocketManager error: \(error)")
                print("❌ ORIGINAL WebSocketManager error details: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self?.connectionStatus = .error
                }
            }
        }
    }
    
    private func handleMessage(_ text: String) {
        print("📨 WebSocket message: \(text)")
        
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            // Extract data from the message
            let messageData = json["data"] as? [String: Any] ?? json
            
            if let phase = messageData["phase"] as? String {
                self?.currentPhase = phase
            }
            
            if let percent = messageData["percent"] as? Double {
                self?.progress = percent / 100.0
            }
            
            if let message = messageData["lastMessage"] as? String {
                self?.lastMessage = message
            }
            
            // Extract report information when audit is complete
            if let reportKey = messageData["reportKey"] as? String {
                self?.reportKey = reportKey
            }
            
            if let summary = messageData["summary"] as? String {
                self?.summary = summary
            }
            
            if let findingsCount = messageData["findingsCount"] as? Int {
                self?.findingsCount = findingsCount
            }
            
            if let type = json["type"] as? String {
                if type == "done" {
                    self?.isComplete = true
                    self?.progress = 1.0
                } else if type == "error" {
                    self?.error = self?.lastMessage ?? "Unknown error"
                }
            }
        }
    }
}
