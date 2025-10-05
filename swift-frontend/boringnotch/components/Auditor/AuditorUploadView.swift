//
//  AuditorUploadView.swift
//  boringNotch
//
//  Upload view for audit documents
//

import SwiftUI
import UniformTypeIdentifiers

struct AuditorUploadView: View {
    @StateObject private var viewModel = AuditorViewModel.shared
    @StateObject private var webSocket = WebSocketManager()
    @State private var isDragOver = false
    @State private var selectedFile: URL?
    @State private var showFilePicker = false
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                Image(systemName: "doc.text.magnifyingglass")
                    .font(.title2)
                Text("Audit Assistant")
                    .font(.headline)
                Spacer()
            }
            .padding(.horizontal)
            
            // Main content based on state
            switch viewModel.uploadState {
            case .idle:
                uploadZone
                
            case .uploading(let progress):
                uploadingView(progress: progress)
                
            case .processing:
                processingView
                
            case .completed:
                completedView
                
            case .failed(let error):
                errorView(error: error)
            }
            
            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.windowBackgroundColor).opacity(0.9))
    }
    
    // MARK: - Upload Zone
    
    private var uploadZone: some View {
        VStack(spacing: 20) {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [10]))
                    .foregroundColor(isDragOver ? .accentColor : .gray.opacity(0.5))
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(isDragOver ? Color.accentColor.opacity(0.1) : Color.clear)
                    )
                    .frame(height: 200)
                
                VStack(spacing: 16) {
                    Image(systemName: isDragOver ? "arrow.down.doc.fill" : "doc.badge.plus")
                        .font(.system(size: 48))
                        .foregroundColor(isDragOver ? .accentColor : .gray)
                    
                    Text(isDragOver ? "Drop to upload" : "Drag & drop PDF or CSV")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text("or")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Button("Choose File") {
                        showFilePicker = true
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .onDrop(of: [UTType.fileURL], isTargeted: $isDragOver) { providers in
                handleDrop(providers: providers)
            }
            
            Text("Supported: PDF, CSV • Max 100MB")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .fileImporter(
            isPresented: $showFilePicker,
            allowedContentTypes: [.pdf, .commaSeparatedText],
            allowsMultipleSelection: false
        ) { result in
            handleFileSelection(result: result)
        }
    }
    
    // MARK: - Uploading View
    
    private func uploadingView(progress: Double) -> some View {
        VStack(spacing: 20) {
            ProgressView(value: progress, total: 1.0)
                .progressViewStyle(.linear)
                .frame(width: 200)
            
            Text(viewModel.statusMessage)
                .font(.headline)
            
            Text("\(Int(progress * 100))%")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(40)
    }
    
    // MARK: - Processing View
    
    private var processingView: some View {
        VStack(spacing: 20) {
            // Animated processing indicator
            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.2), lineWidth: 8)
                    .frame(width: 100, height: 100)
                
                Circle()
                    .trim(from: 0, to: CGFloat(webSocket.progress) / 100.0)
                    .stroke(
                        AngularGradient(
                            gradient: Gradient(colors: [.blue, .purple, .blue]),
                            center: .center
                        ),
                        style: StrokeStyle(lineWidth: 8, lineCap: .round)
                    )
                    .frame(width: 100, height: 100)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut, value: webSocket.progress)
                
                Text("\(webSocket.progress)%")
                    .font(.title2)
                    .bold()
            }
            
            VStack(spacing: 8) {
                Text(webSocket.currentPhase)
                    .font(.headline)
                
                Text(webSocket.lastMessage)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            if webSocket.connectionStatus == .connected {
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 8, height: 8)
                    Text("Live")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(40)
    }
    
    // MARK: - Completed View
    
    private var completedView: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundColor(.green)
            
            Text("Audit Complete!")
                .font(.title2)
                .bold()
            
            if let summary = webSocket.summary, !summary.isEmpty {
                Text(summary)
                    .font(.body)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            
            if webSocket.findingsCount > 0 {
                Text("\(webSocket.findingsCount) findings")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            if let runId = viewModel.currentRun?.runId {
                Text("Run ID: \(runId)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .textSelection(.enabled)
            }
            
            HStack(spacing: 12) {
                Button {
                    Task {
                        await viewModel.openReport()
                    }
                } label: {
                    HStack {
                        Image(systemName: "doc.text.magnifyingglass")
                        Text("Show Report")
                    }
                }
                .buttonStyle(.borderedProminent)
                
                Button("Upload Another") {
                    viewModel.reset()
                }
                .buttonStyle(.bordered)
            }
        }
        .padding(40)
    }
    
    // MARK: - Error View
    
    private func errorView(error: Error) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 64))
                .foregroundColor(.orange)
            
            Text("Upload Failed")
                .font(.title2)
                .bold()
            
            Text(error.localizedDescription)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Try Again") {
                viewModel.reset()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(40)
    }
    
    // MARK: - Handlers
    
    private func handleDrop(providers: [NSItemProvider]) -> Bool {
        guard let provider = providers.first else { return false }
        
        _ = provider.loadObject(ofClass: URL.self) { url, error in
            guard let url = url else { return }
            
            DispatchQueue.main.async {
                self.selectedFile = url
                self.startUpload(fileURL: url)
            }
        }
        
        return true
    }
    
    private func handleFileSelection(result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            selectedFile = url
            startUpload(fileURL: url)
            
        case .failure(let error):
            print("File selection error: \(error)")
        }
    }
    
    private func startUpload(fileURL: URL) {
        Task {
            await viewModel.uploadFile(fileURL)
        }
    }
}

#Preview {
    AuditorUploadView()
}

