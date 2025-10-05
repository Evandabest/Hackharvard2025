//
//  ContentView.swift
//  boringNotchApp
//
//  Created by Harsh Vardhan Goswami  on 02/08/24
//  Modified by Richard Kunkli on 24/08/2024.
//

import AVFoundation
import Combine
import Defaults
import KeyboardShortcuts
import SwiftUI
import SwiftUIIntrospect

// MARK: - Simple WebSocket Manager for ContentView

class SimpleWebSocketManager: ObservableObject {
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
            print("🔥🔥🔥 WebSocket connect() called with runId: \(runId) 🔥🔥🔥")
            print("🔥🔥🔥 DEBUG: WebSocket connect() called! 🔥🔥🔥")
            
            guard let url = URL(string: "wss://auditor-edge.evanhaque1.workers.dev/ws/run/\(runId)") else {
                print("❌ Invalid WebSocket URL")
                return
            }
            
            connectionStatus = .connecting
            print("🔄 Connecting to WebSocket: \(url)")
            print("🔄 Run ID: \(runId)")
            
            urlSession = URLSession(configuration: .default)
            webSocketTask = urlSession?.webSocketTask(with: url)
            print("🔄 WebSocket task created: \(webSocketTask != nil)")
            
            // Add a small delay to ensure the WebSocket is properly set up
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                print("🔄 About to resume WebSocket task")
                self.webSocketTask?.resume()
                self.connectionStatus = .connected
                print("✅ WebSocket connected")
                
                // Test WebSocket with a ping
                self.webSocketTask?.sendPing { error in
                    if let error = error {
                        print("❌ WebSocket ping failed: \(error)")
                    } else {
                        print("✅ WebSocket ping successful")
                    }
                }
                
                // Start listening for messages
                print("🔄 Starting to receive messages...")
                self.receiveMessage()
            }
        }
    
    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        urlSession = nil
        connectionStatus = .disconnected
        print("🔌 WebSocket disconnected")
    }
    
        private func receiveMessage() {
            print("🔄 WebSocket: Starting to receive messages...")
            webSocketTask?.receive { [weak self] result in
                print("🔄 WebSocket: Received result: \(result)")
                print("🔄 WebSocket: Current state before processing - isComplete: \(self?.isComplete ?? false)")
                switch result {
                case .success(let message):
                    print("✅ WebSocket: Message received successfully")
                    switch message {
                    case .string(let text):
                        print("📝 WebSocket: String message: \(text)")
                        self?.handleMessage(text)
                    case .data(let data):
                        print("📦 WebSocket: Data message: \(data.count) bytes")
                        if let text = String(data: data, encoding: .utf8) {
                            print("📝 WebSocket: Data as string: \(text)")
                            self?.handleMessage(text)
                        }
                    @unknown default:
                        print("❓ WebSocket: Unknown message type")
                        break
                    }
                    
                    // Continue listening
                    print("🔄 WebSocket: Continuing to listen for messages...")
                    self?.receiveMessage()
                    
                case .failure(let error):
                    print("❌ WebSocket error: \(error)")
                    print("❌ WebSocket error details: \(error.localizedDescription)")
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
                print("❌ Failed to parse WebSocket message as JSON")
                return
            }
            
            print("📊 Parsed WebSocket JSON: \(json)")
            
            DispatchQueue.main.async { [weak self] in
                // Extract data from the message
                let messageData = json["data"] as? [String: Any] ?? json
                print("📊 Message data: \(messageData)")
                
                if let phase = messageData["phase"] as? String {
                    print("🔄 Phase: \(phase)")
                    self?.currentPhase = phase
                }
                
                if let percent = messageData["percent"] as? Double {
                    print("📈 Percent: \(percent)")
                    self?.progress = percent / 100.0
                }
                
                if let message = messageData["lastMessage"] as? String {
                    print("💬 Message: \(message)")
                    self?.lastMessage = message
                }
                
                // Extract report information when audit is complete
                if let reportKey = messageData["reportKey"] as? String {
                    print("🔑 Report Key: \(reportKey)")
                    self?.reportKey = reportKey
                }
                
                if let summary = messageData["summary"] as? String {
                    print("📝 Summary: \(summary)")
                    self?.summary = summary
                }
                
                if let findingsCount = messageData["findingsCount"] as? Int {
                    print("🔍 Findings Count: \(findingsCount)")
                    self?.findingsCount = findingsCount
                }
                
                if let type = json["type"] as? String {
                    print("🏷️ Message Type: \(type)")
                    if type == "done" {
                        print("✅ Audit completed!")
                        print("📊 Full message data: \(json)")
                        
                        // Extract report details from the message
                        if let data = json["data"] as? [String: Any] {
                            if let reportKey = data["reportKey"] as? String {
                                print("📄 Report Key: \(reportKey)")
                                self?.reportKey = reportKey
                            }
                            if let summary = data["summary"] as? String {
                                print("📝 Summary: \(summary)")
                                self?.summary = summary
                            }
                            if let findingsCount = data["findingsCount"] as? Int {
                                print("🔍 Findings Count: \(findingsCount)")
                                self?.findingsCount = findingsCount
                            }
                        }
                        
                        self?.isComplete = true
                        self?.progress = 1.0
                    } else if type == "error" {
                        print("❌ Audit error: \(self?.lastMessage ?? "Unknown error")")
                        self?.error = self?.lastMessage ?? "Unknown error"
                    }
                }
                
                // Log final state after processing message
                print("🔥 Final WebSocket state:")
                print("🔥 - isComplete: \(self?.isComplete ?? false)")
                print("🔥 - reportKey: \(self?.reportKey ?? "nil")")
                print("🔥 - summary: \(self?.summary ?? "nil")")
                print("🔥 - findingsCount: \(self?.findingsCount ?? 0)")
                print("🔥 - connectionStatus: \(self?.connectionStatus ?? .disconnected)")
                
                // State will be saved by the parent view when it updates
            }
        }
}

struct ContentView: View {
    @EnvironmentObject var vm: BoringViewModel
    @ObservedObject var webcamManager = WebcamManager.shared

    @ObservedObject var coordinator = BoringViewCoordinator.shared
    @ObservedObject var musicManager = MusicManager.shared
    @ObservedObject var batteryModel = BatteryStatusViewModel.shared

    @State private var isHovering: Bool = false
    @State private var hoverWorkItem: DispatchWorkItem?
    @State private var debounceWorkItem: DispatchWorkItem?

    @State private var isHoverStateChanging: Bool = false

    @State private var gestureProgress: CGFloat = .zero

    @State private var haptics: Bool = false

    @Namespace var albumArtNamespace

    @Default(.useMusicVisualizer) var useMusicVisualizer

    @Default(.showNotHumanFace) var showNotHumanFace
    @Default(.useModernCloseAnimation) var useModernCloseAnimation

    private let extendedHoverPadding: CGFloat = 30
    private let zeroHeightHoverPadding: CGFloat = 10

    var body: some View {
        ZStack(alignment: .top) {
            let mainLayout = NotchLayout()
                .frame(alignment: .top)
                .padding(
                    .horizontal,
                    vm.notchState == .open
                        ? Defaults[.cornerRadiusScaling]
                            ? (cornerRadiusInsets.opened.top) : (cornerRadiusInsets.opened.bottom)
                        : cornerRadiusInsets.closed.bottom
                )
                .padding([.horizontal, .bottom], vm.notchState == .open ? 12 : 0)
                .background(.black)
                .mask {
                    ((vm.notchState == .open) && Defaults[.cornerRadiusScaling])
                        ? NotchShape(
                            topCornerRadius: cornerRadiusInsets.opened.top,
                            bottomCornerRadius: cornerRadiusInsets.opened.bottom
                        )
                        .drawingGroup()
                        : NotchShape(
                            topCornerRadius: cornerRadiusInsets.closed.top,
                            bottomCornerRadius: cornerRadiusInsets.closed.bottom
                        )
                        .drawingGroup()
                }
                .padding(
                    .bottom,
                    vm.notchState == .open && Defaults[.extendHoverArea]
                        ? 0
                        : (vm.effectiveClosedNotchHeight == 0)
                            ? zeroHeightHoverPadding
                            : 0
                )

            mainLayout
                .conditionalModifier(!useModernCloseAnimation) { view in
                    let hoverAnimationAnimation = Animation.bouncy.speed(1.2)
                    let notchStateAnimation = Animation.spring.speed(1.2)
                    return
                        view
                        .animation(hoverAnimationAnimation, value: isHovering)
                        .animation(notchStateAnimation, value: vm.notchState)
                        .animation(.smooth, value: gestureProgress)
                        .transition(
                            .blurReplace.animation(.interactiveSpring(dampingFraction: 1.2)))
                }
                .conditionalModifier(useModernCloseAnimation) { view in
                    let hoverAnimationAnimation = Animation.bouncy.speed(1.2)
                    let notchStateAnimation = Animation.spring.speed(1.2)
                    return view
                        .animation(hoverAnimationAnimation, value: isHovering)
                        .animation(notchStateAnimation, value: vm.notchState)
                }
                .conditionalModifier(Defaults[.openNotchOnHover]) { view in
                    view.onHover { hovering in
                        handleHover(hovering)
                    }
                }
                .conditionalModifier(!Defaults[.openNotchOnHover]) { view in
                    view
                        .onHover { hovering in
                            if (vm.notchState == .closed) && Defaults[.enableHaptics] {
                                haptics.toggle()
                            }

                            withAnimation(vm.animation) {
                                isHovering = hovering
                            }

                            // Only close if mouse leaves and the notch is open
                            if !hovering && vm.notchState == .open {
                                vm.close()
                            }
                        }
                        .onTapGesture {
                            doOpen()
                        }
                        .conditionalModifier(Defaults[.enableGestures]) { view in
                            view
                                .panGesture(direction: .down) { translation, phase in
                                    handleDownGesture(translation: translation, phase: phase)
                                }
                        }
                }
                .conditionalModifier(Defaults[.closeGestureEnabled] && Defaults[.enableGestures]) { view in
                    view
                        .panGesture(direction: .up) { translation, phase in
                            handleUpGesture(translation: translation, phase: phase)
                        }
                }
                .onAppear(perform: {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                        withAnimation(vm.animation) {
                            if coordinator.firstLaunch {
                                doOpen()
                            }
                        }
                    }
                })
                .onChange(of: vm.notchState) { _, newState in
                    // Reset hover state when notch state changes
                    if newState == .closed && isHovering {
                        // Only reset visually, without triggering the hover logic again
                        isHoverStateChanging = true
                        withAnimation {
                            isHovering = false
                        }
                        // Reset the flag after the animation completes
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            isHoverStateChanging = false
                        }
                    }
                }
                .onChange(of: vm.isBatteryPopoverActive) { _, newPopoverState in
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        if !newPopoverState && !isHovering && vm.notchState == .open {
                            vm.close()
                        }
                    }
                }
                .sensoryFeedback(.alignment, trigger: haptics)
                .contextMenu {
                    Button("Settings") {
                        SettingsWindowController.shared.showWindow()
                    }
                    .keyboardShortcut(KeyEquivalent(","), modifiers: .command)
//                    Button("Edit") { // Doesnt work....
//                        let dn = DynamicNotch(content: EditPanelView())
//                        dn.toggle()
//                    }
//                    #if DEBUG
//                    .disabled(false)
//                    #else
//                    .disabled(true)
//                    #endif
//                    .keyboardShortcut("E", modifiers: .command)
                }
        }
        .padding(.bottom, 8)
        .frame(maxWidth: openNotchSize.width, maxHeight: openNotchSize.height, alignment: .top)
        .shadow(
            color: ((vm.notchState == .open || isHovering) && Defaults[.enableShadow])
                ? .black.opacity(0.2) : .clear, radius: Defaults[.cornerRadiusScaling] ? 6 : 4
        )
        .background(dragDetector)
        .environmentObject(vm)
    }

    @ViewBuilder
    func NotchLayout() -> some View {
        VStack(alignment: .leading) {
            VStack(alignment: .leading) {
                if coordinator.firstLaunch {
                    Spacer()
                    HelloAnimation().frame(width: 200, height: 80).onAppear(perform: {
                        vm.closeHello()
                    })
                    .padding(.top, 40)
                    Spacer()
                } else {
                    if coordinator.expandingView.type == .battery && coordinator.expandingView.show
                        && vm.notchState == .closed && Defaults[.showPowerStatusNotifications]
                    {
                        HStack(spacing: 0) {
                            HStack {
                                Text(batteryModel.statusText)
                                    .font(.subheadline)
                                    .foregroundStyle(.white)
                            }

                            Rectangle()
                                .fill(.black)
                                .frame(width: vm.closedNotchSize.width + 10)

                            HStack {
                                BoringBatteryView(
                                    batteryWidth: 30,
                                    isCharging: batteryModel.isCharging,
                                    isInLowPowerMode: batteryModel.isInLowPowerMode,
                                    isPluggedIn: batteryModel.isPluggedIn,
                                    levelBattery: batteryModel.levelBattery,
                                    isForNotification: true
                                )
                            }
                            .frame(width: 76, alignment: .trailing)
                        }
                        .frame(height: vm.effectiveClosedNotchHeight + (isHovering ? 8 : 0), alignment: .center)
                      } else if coordinator.sneakPeek.show && Defaults[.inlineHUD] && (coordinator.sneakPeek.type != .music) && (coordinator.sneakPeek.type != .battery) {
                          InlineHUD(type: $coordinator.sneakPeek.type, value: $coordinator.sneakPeek.value, icon: $coordinator.sneakPeek.icon, hoverAnimation: $isHovering, gestureProgress: $gestureProgress)
                              .transition(.opacity)
                      } else if (!coordinator.expandingView.show || coordinator.expandingView.type == .music) && vm.notchState == .closed && (musicManager.isPlaying || !musicManager.isPlayerIdle) && coordinator.musicLiveActivityEnabled && !vm.hideOnClosed {
                          MusicLiveActivity()
                      } else if !coordinator.expandingView.show && vm.notchState == .closed && (!musicManager.isPlaying && musicManager.isPlayerIdle) && Defaults[.showNotHumanFace] && !vm.hideOnClosed  {
                          BoringFaceAnimation().animation(.interactiveSpring, value: musicManager.isPlayerIdle)
                      } else if vm.notchState == .open {
                          BoringHeader()
                              .frame(height: max(24, vm.effectiveClosedNotchHeight))
                              .blur(radius: abs(gestureProgress) > 0.3 ? min(abs(gestureProgress), 8) : 0)
                              .animation(.spring(response: 1, dampingFraction: 1, blendDuration: 0.8), value: vm.notchState)
                       } else {
                           Rectangle().fill(.clear).frame(width: vm.closedNotchSize.width - 20, height: vm.effectiveClosedNotchHeight)
                       }

                      if coordinator.sneakPeek.show {
                          if (coordinator.sneakPeek.type != .music) && (coordinator.sneakPeek.type != .battery) && !Defaults[.inlineHUD] {
                              SystemEventIndicatorModifier(eventType: $coordinator.sneakPeek.type, value: $coordinator.sneakPeek.value, icon: $coordinator.sneakPeek.icon, sendEventBack: { _ in
                                  //
                              })
                              .padding(.bottom, 10)
                              .padding(.leading, 4)
                              .padding(.trailing, 8)
                          }
                          // Old sneak peek music
                          else if coordinator.sneakPeek.type == .music {
                              if vm.notchState == .closed && !vm.hideOnClosed && Defaults[.sneakPeekStyles] == .standard {
                                  HStack(alignment: .center) {
                                      Image(systemName: "music.note")
                                      GeometryReader { geo in
                                          MarqueeText(.constant(musicManager.songTitle + " - " + musicManager.artistName),  textColor: Defaults[.playerColorTinting] ? Color(nsColor: musicManager.avgColor).ensureMinimumBrightness(factor: 0.6) : .gray, minDuration: 1, frameWidth: geo.size.width)
                                      }
                                  }
                                  .foregroundStyle(.gray)
                                  .padding(.bottom, 10)
                              }
                          }
                      }
                  }
              }
              .conditionalModifier((coordinator.sneakPeek.show && (coordinator.sneakPeek.type == .music) && vm.notchState == .closed && !vm.hideOnClosed && Defaults[.sneakPeekStyles] == .standard) || (coordinator.sneakPeek.show && (coordinator.sneakPeek.type != .music) && (vm.notchState == .closed))) { view in
                  view
                      .fixedSize()
              }
              .zIndex(2)

            ZStack {
                if vm.notchState == .open {
                    switch coordinator.currentView {
                    case .home:
                        NotchHomeView(albumArtNamespace: albumArtNamespace)
                    case .shelf:
                        NotchShelfView()
                    case .auditor:
                        AuditorView()
                    }
                }
            }
            .zIndex(1)
            .allowsHitTesting(vm.notchState == .open)
            .blur(radius: abs(gestureProgress) > 0.3 ? min(abs(gestureProgress), 8) : 0)
            .opacity(abs(gestureProgress) > 0.3 ? min(abs(gestureProgress * 2), 0.8) : 1)
        }
    }

    @ViewBuilder
    func BoringFaceAnimation() -> some View {
        HStack {
            HStack {
                Rectangle()
                    .fill(.clear)
                    .frame(
                        width: max(0, vm.effectiveClosedNotchHeight - 12),
                        height: max(0, vm.effectiveClosedNotchHeight - 12))
                Rectangle()
                    .fill(.black)
                    .frame(width: vm.closedNotchSize.width - 20)
                MinimalFaceFeatures()
            }
        }.frame(height: vm.effectiveClosedNotchHeight + (isHovering ? 8 : 0), alignment: .center)
    }

    @ViewBuilder
    func MusicLiveActivity() -> some View {
        HStack {
            HStack {
                Color.clear
                    .aspectRatio(1, contentMode: .fit)
                    .background(
                        Image(nsImage: musicManager.albumArt)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    )
                    .clipped()
                    .clipShape(
                        RoundedRectangle(
                            cornerRadius: MusicPlayerImageSizes.cornerRadiusInset.closed)
                    )
                    .matchedGeometryEffect(id: "albumArt", in: albumArtNamespace)
                    .frame(
                        width: max(0, vm.effectiveClosedNotchHeight - 12),
                        height: max(0, vm.effectiveClosedNotchHeight - 12))
            }
            .frame(
                width: max(
                    0, vm.effectiveClosedNotchHeight - (isHovering ? 0 : 12) + gestureProgress / 2),
                height: max(0, vm.effectiveClosedNotchHeight - (isHovering ? 0 : 12)))

            Rectangle()
                .fill(.black)
                .overlay(
                    HStack(alignment: .top) {
                        if coordinator.expandingView.show
                            && coordinator.expandingView.type == .music
                        {
                            MarqueeText(
                                .constant(musicManager.songTitle),
                                textColor: Defaults[.coloredSpectrogram]
                                    ? Color(nsColor: musicManager.avgColor) : Color.gray,
                                minDuration: 0.4,
                                frameWidth: 100
                            )
                            .opacity(
                                (coordinator.expandingView.show && Defaults[.enableSneakPeek]
                                    && Defaults[.sneakPeekStyles] == .inline) ? 1 : 0)
                            Spacer(minLength: vm.closedNotchSize.width)
                            // Song Artist
                            Text(musicManager.artistName)
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .foregroundStyle(
                                    Defaults[.coloredSpectrogram]
                                        ? Color(nsColor: musicManager.avgColor) : Color.gray
                                )
                                .opacity(
                                    (coordinator.expandingView.show
                                        && coordinator.expandingView.type == .music
                                        && Defaults[.enableSneakPeek]
                                        && Defaults[.sneakPeekStyles] == .inline) ? 1 : 0)
                        }
                    }
                )
                .frame(
                    width: (coordinator.expandingView.show
                        && coordinator.expandingView.type == .music && Defaults[.enableSneakPeek]
                        && Defaults[.sneakPeekStyles] == .inline)
                        ? 380 : vm.closedNotchSize.width + (isHovering ? 8 : 0))

            HStack {
                if useMusicVisualizer {
                    Rectangle()
                        .fill(
                            Defaults[.coloredSpectrogram]
                                ? Color(nsColor: musicManager.avgColor).gradient
                                : Color.gray.gradient
                        )
                        .frame(width: 50, alignment: .center)
                        .matchedGeometryEffect(id: "spectrum", in: albumArtNamespace)
                        .mask {
                            AudioSpectrumView(isPlaying: $musicManager.isPlaying)
                                .frame(width: 16, height: 12)
                        }
                        .frame(
                            width: max(
                                0,
                                vm.effectiveClosedNotchHeight - (isHovering ? 0 : 12)
                                    + gestureProgress / 2),
                            height: max(0, vm.effectiveClosedNotchHeight - (isHovering ? 0 : 12)),
                            alignment: .center)
                } else {
                    LottieAnimationView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .frame(
                width: max(
                    0, vm.effectiveClosedNotchHeight - (isHovering ? 0 : 12) + gestureProgress / 2),
                height: max(0, vm.effectiveClosedNotchHeight - (isHovering ? 0 : 12)),
                alignment: .center)
        }
        .frame(height: vm.effectiveClosedNotchHeight + (isHovering ? 8 : 0), alignment: .center)
    }

    @ViewBuilder
    var dragDetector: some View {
        if Defaults[.boringShelf] {
            Color.clear
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .contentShape(Rectangle())
                .onDrop(of: [.data], isTargeted: $vm.dragDetectorTargeting) { _ in true }
                .onChange(of: vm.anyDropZoneTargeting) { _, isTargeted in
                    if isTargeted, vm.notchState == .closed {
                        // Don't change the current tab, just open the notch
                        // User's last selected tab will be shown
                        doOpen()
                    } else if !isTargeted {
                        print("DROP EVENT", vm.dropEvent)
                        if vm.dropEvent {
                            vm.dropEvent = false
                            return
                        }

                        vm.dropEvent = false
                        vm.close()
                    }
                }
        } else {
            EmptyView()
        }
    }

    private func doOpen() {
        withAnimation(.bouncy.speed(1.2)) {
            vm.open()
        }
    }

    // MARK: - Hover Management

    /// Handle hover state changes with debouncing
    private func handleHover(_ hovering: Bool) {
        // Don't process events if we're already transitioning
        if isHoverStateChanging { return }

        // Cancel any pending tasks
        hoverWorkItem?.cancel()
        hoverWorkItem = nil
        debounceWorkItem?.cancel()
        debounceWorkItem = nil

        if hovering {
            // Handle mouse enter
            withAnimation(.bouncy.speed(1.2)) {
                isHovering = true
            }

            // Only provide haptic feedback if notch is closed
            if vm.notchState == .closed && Defaults[.enableHaptics] {
                haptics.toggle()
            }

            // Don't open notch if there's a sneak peek showing
            if coordinator.sneakPeek.show {
                return
            }

            // Delay opening the notch
            let task = DispatchWorkItem {
                // ContentView is a struct, so we don't use weak self here
                guard vm.notchState == .closed, isHovering else { return }
                doOpen()
            }

            hoverWorkItem = task
            DispatchQueue.main.asyncAfter(
                deadline: .now() + Defaults[.minimumHoverDuration],
                execute: task
            )
        } else {
            // Handle mouse exit with debounce to prevent flickering
            let debounce = DispatchWorkItem {
                // ContentView is a struct, so we don't use weak self here

                // Update visual state
                withAnimation(.bouncy.speed(1.2)) {
                    isHovering = false
                }

                // Close the notch if it's open and battery popover is not active
                if vm.notchState == .open && !vm.isBatteryPopoverActive {
                    vm.close()
                }
            }

            debounceWorkItem = debounce
            // Delay before auto-closing (doubled from 0.1 to 0.2 seconds)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: debounce)
        }
    }

    // MARK: - Gesture Handling

    private func handleDownGesture(translation: CGFloat, phase: NSEvent.Phase) {
        guard vm.notchState == .closed else { return }

        withAnimation(.smooth) {
            gestureProgress = (translation / Defaults[.gestureSensitivity]) * 20
        }

        if phase == .ended {
            withAnimation(.smooth) {
                gestureProgress = .zero
            }
        }

        if translation > Defaults[.gestureSensitivity] {
            if Defaults[.enableHaptics] {
                haptics.toggle()
            }
            withAnimation(.smooth) {
                gestureProgress = .zero
            }
            doOpen()
        }
    }

    private func handleUpGesture(translation: CGFloat, phase: NSEvent.Phase) {
        if vm.notchState == .open && !vm.isHoveringCalendar {
            withAnimation(.smooth) {
                gestureProgress = (translation / Defaults[.gestureSensitivity]) * -20
            }

            if phase == .ended {
                withAnimation(.smooth) {
                    gestureProgress = .zero
                }
            }

            if translation > Defaults[.gestureSensitivity] {
                withAnimation(.smooth) {
                    gestureProgress = .zero
                    isHovering = false
                }
                vm.close()

                if Defaults[.enableHaptics] {
                    haptics.toggle()
                }
            }
        }
    }
}

struct FullScreenDropDelegate: DropDelegate {
    @Binding var isTargeted: Bool
    let onDrop: () -> Void

    func dropEntered(info _: DropInfo) {
        isTargeted = true
    }

    func dropExited(info _: DropInfo) {
        isTargeted = false
    }

    func performDrop(info _: DropInfo) -> Bool {
        isTargeted = false
        onDrop()
        return true
    }
}

#Preview {
    let vm = BoringViewModel()
    vm.open()
    return ContentView()
        .environmentObject(vm)
        .frame(width: vm.notchSize.width, height: vm.notchSize.height)
}

// MARK: - Auditor View

    struct AuditorView: View {
        @EnvironmentObject var vm: BoringViewModel
        @StateObject var tvm = TrayDrop.shared
        @StateObject private var webSocket = SimpleWebSocketManager()
        @State private var isProcessing = false
        @State private var runId = ""
        @State private var progress: Double = 0.0
        @State private var currentPhase = ""
        @State private var isComplete = false
        @State private var reportKey: String?
        
        init() {
            NSLog("🔥🔥🔥 DEBUG: AuditorView INITIALIZED! 🔥🔥🔥")
        }
        
    func onAppear() {
        print("🔥🔥🔥 DEBUG: onAppear() called! 🔥🔥🔥")
        print("🔥🔥🔥 DEBUG: Initial state - isProcessing: \(isProcessing), isComplete: \(isComplete), runId: '\(runId)'")
        // Restore state from UserDefaults
        restoreState()
        print("🔄 onAppear - restored state: isProcessing=\(isProcessing), isComplete=\(isComplete), runId=\(runId)")
        print("🔥🔥🔥 DEBUG: Final state after restore - isProcessing: \(isProcessing), isComplete: \(isComplete), runId: '\(runId)'")
    }
        
        func saveState() {
            UserDefaults.standard.set(runId, forKey: "audit_runId")
            UserDefaults.standard.set(isProcessing, forKey: "audit_isProcessing")
            UserDefaults.standard.set(isComplete, forKey: "audit_isComplete")
            UserDefaults.standard.set(reportKey, forKey: "audit_reportKey")
            UserDefaults.standard.set(webSocket.currentPhase, forKey: "audit_currentPhase")
            UserDefaults.standard.set(webSocket.progress, forKey: "audit_progress")
            print("💾 Saved audit state: runId=\(runId), isProcessing=\(isProcessing), isComplete=\(isComplete), reportKey=\(reportKey ?? "nil")")
        }
        
        func restoreState() {
            let savedRunId = UserDefaults.standard.string(forKey: "audit_runId") ?? ""
            let savedIsProcessing = UserDefaults.standard.bool(forKey: "audit_isProcessing")
            let savedIsComplete = UserDefaults.standard.bool(forKey: "audit_isComplete")
            let savedCurrentPhase = UserDefaults.standard.string(forKey: "audit_currentPhase") ?? ""
            let savedProgress = UserDefaults.standard.double(forKey: "audit_progress")
            let savedReportKey = UserDefaults.standard.string(forKey: "audit_reportKey")
            
            if !savedRunId.isEmpty {
                runId = savedRunId
                isProcessing = savedIsProcessing
                isComplete = savedIsComplete
                reportKey = savedReportKey
                webSocket.currentPhase = savedCurrentPhase
                webSocket.progress = savedProgress
                
                print("🔄 Restored audit state: runId=\(runId), isProcessing=\(isProcessing), isComplete=\(isComplete), reportKey=\(reportKey ?? "nil")")
                
                if isProcessing && !isComplete {
                    print("🔄 Reconnecting WebSocket for ongoing audit...")
                    webSocket.connect(to: runId)
                }
            }
        }

    var body: some View {
        print("🔥🔥🔥 DEBUG: AuditorView body called! 🔥🔥🔥")
        return VStack(spacing: 0) {
            // Main content area
            HStack {
                // Left side: Run Audit button (replaces AirDrop)
                auditButton
                // Right side: Drop zone panel (same as Shelf)
                panel
                    .onDrop(of: [.data], isTargeted: $vm.dropZoneTargeting) { providers in
                        vm.dropEvent = true
                        DispatchQueue.global().async {
                            tvm.load(providers)
                        }
                        return true
                    }
            }
            
            // Show Report button in green bar - expands from bottom
            // Only show if we have a report key (meaning the report is actually ready)
            if isComplete && reportKey != nil {
                showReportBar
            }
        }
        .onAppear {
            print("🔥🔥🔥 DEBUG: .onAppear called! 🔥🔥🔥")
            onAppear()
        }
    }

    var auditButton: some View {
        Rectangle()
            .fill(.white.opacity(0.1))
            .onAppear {
                print("🔥🔥🔥 DEBUG: auditButton appeared! 🔥🔥🔥")
            }
            .opacity(0.5)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay { auditLabel }
            .aspectRatio(1, contentMode: .fit)
            .contentShape(Rectangle())
    }
    
        var auditLabel: some View {
            VStack(spacing: 8) {
                if isProcessing {
                    // Show progress in the button area
                    VStack(spacing: 4) {
                        ProgressView(value: webSocket.progress)
                            .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                            .frame(width: 40)
                        
                        Text(webSocket.currentPhase.isEmpty ? "Processing..." : webSocket.currentPhase)
                            .font(.system(.caption, design: .rounded))
                            .lineLimit(1)
                            .truncationMode(.tail)
                    }
                } else {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 24))
                        .symbolEffect(.pulse, isActive: false)
                    
                    Text("Run Audit")
                        .font(.system(.headline, design: .rounded))
                }
            }
            .foregroundStyle(.gray)
            .contentShape(Rectangle())
            .onTapGesture {
                NSLog("🔥 DEBUG: Button tapped! isProcessing: \(isProcessing), isComplete: \(isComplete)")
                print("🔥🔥🔥 DEBUG: Button tapped! isProcessing: \(isProcessing), isComplete: \(isComplete)")
                print("🔥🔥🔥 DEBUG: Button condition check: !isProcessing=\(!isProcessing), !isComplete=\(!isComplete)")
                if !isProcessing && !isComplete {
                    print("🔥🔥🔥 DEBUG: Calling runAudit() from button tap!")
                    runAudit()
                } else if isComplete {
                    print("🔥🔥🔥 DEBUG: Calling resetAudit() from button tap!")
                    // Reset for new audit
                    resetAudit()
                } else {
                    print("🔥🔥🔥 DEBUG: Button tap ignored - isProcessing: \(isProcessing), isComplete: \(isComplete)")
                }
            }
        }

    var panel: some View {
        RoundedRectangle(cornerRadius: 16)
            .strokeBorder(style: StrokeStyle(lineWidth: 4, dash: [10]))
            .foregroundStyle(.white.opacity(0.1))
            .overlay {
                content
                    .padding()
            }
            .animation(vm.animation, value: tvm.items)
            .animation(vm.animation, value: tvm.isLoading)
    }
    
    var showReportBar: some View {
        HStack {
            // Left side: Show Report button
            Button(action: {
                print("🔥 DEBUG: Show Report button tapped!")
                openReport()
            }) {
                HStack(spacing: 8) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                    
                    Text("Show Report")
                        .font(.system(.headline, design: .rounded))
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.2))
                .cornerRadius(8)
            }
            .buttonStyle(PlainButtonStyle())
            
            Spacer()
            
            // Right side: New Audit button
            Button(action: {
                print("🔥 DEBUG: New Audit tapped!")
                resetAudit()
            }) {
                Text("New Audit")
                    .font(.system(.caption, design: .rounded))
                    .fontWeight(.medium)
                    .foregroundColor(.white.opacity(0.8))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(6)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.green)
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .animation(.easeInOut(duration: 0.3), value: isComplete)
    }

    var content: some View {
        Group {
            if tvm.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .symbolVariant(.fill)
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(.white, .gray)
                        .imageScale(.large)
                    
                    Text("Drop PDF or CSV here")
                        .foregroundStyle(.gray)
                        .font(.system(.title3, design: .rounded))
                        .fontWeight(.medium)
                }
            } else {
                ScrollView(.horizontal) {
                    HStack(spacing: spacing) {
                        ForEach(tvm.items) { item in
                            DropItemView(item: item)
                        }
                    }
                    .padding(spacing)
                }
                .padding(-spacing)
                .scrollIndicators(.never)
            }
        }
    }
    
    private var spacing: CGFloat { 8 }
    
    private func runAudit() {
        print("🔥🔥🔥 DEBUG: runAudit() called! 🔥🔥🔥")
        NSLog("🔥 DEBUG: runAudit() called!")
        guard !tvm.isEmpty else { 
            NSLog("❌ No files to audit")
            return 
        }
        
        Task {
            isProcessing = true
            isComplete = false
            saveState() // Save state immediately
            NSLog("🚀 Starting audit process...")
            
            do {
                // Get the first file from the tray
                guard let firstItem = tvm.items.first else { 
                    NSLog("❌ No file found in tray")
                    return 
                }
                let fileURL = firstItem.storageURL
                NSLog("📁 Processing file: \(fileURL.lastPathComponent)")
                
                NSLog("DEBUG: About to call uploadFile with URL: \(fileURL)")
                let response = try await uploadFile(fileURL)
                print("✅ Upload successful: \(response.runId)")
                runId = response.runId
                saveState() // Save state after getting runId
                
                // Connect WebSocket for real-time updates
                print("🔗 Connecting WebSocket to runId: \(response.runId)")
                print("🔗 WebSocket object: \(webSocket)")
                print("🔗 About to call webSocket.connect()")
                webSocket.connect(to: response.runId)
                print("🔗 WebSocket connect called - completed")
                print("🔥🔥🔥 DEBUG: WebSocket connect completed! 🔥🔥🔥")
                
                // Monitor WebSocket for completion
                print("🔥🔥🔥 DEBUG: About to call monitorWebSocket() 🔥🔥🔥")
                print("🔥🔥🔥 DEBUG: Current state before monitoring: isProcessing=\(isProcessing), isComplete=\(isComplete)")
                await monitorWebSocket()
                print("🔥🔥🔥 DEBUG: monitorWebSocket() completed 🔥🔥🔥")
                print("🔥🔥🔥 DEBUG: Current state after monitoring: isProcessing=\(isProcessing), isComplete=\(isComplete)")
                
                // If WebSocket didn't complete, try polling the backend directly
                if isProcessing && !isComplete {
                    print("🔄 WebSocket didn't complete, trying direct polling...")
                    print("🔄 Current state - isProcessing: \(isProcessing), isComplete: \(isComplete)")
                    await pollAuditStatus(runId: response.runId)
                } else {
                    print("✅ WebSocket completed successfully!")
                    print("✅ Final state - isProcessing: \(isProcessing), isComplete: \(isComplete)")
                }
                
            } catch {
                print("❌ Audit failed: \(error)")
                print("❌ Error details: \(error.localizedDescription)")
                isProcessing = false
                saveState() // Save state after error
            }
        }
    }
    
    private func monitorWebSocket() async {
        // Monitor WebSocket for completion
        var timeoutCounter = 0
        let maxTimeout = 120 // 60 seconds timeout (120 * 500ms = 60s)
        
        print("🔄 Starting WebSocket monitoring...")
        print("🔄 WebSocket connection status: \(webSocket.connectionStatus)")
        print("🔄 WebSocket isComplete: \(webSocket.isComplete)")
        
        while isProcessing && !isComplete {
            print("🔄 Monitoring loop - isProcessing: \(isProcessing), isComplete: \(isComplete)")
            print("🔄 WebSocket state - isComplete: \(webSocket.isComplete), connectionStatus: \(webSocket.connectionStatus)")
            
            if webSocket.isComplete {
                print("✅ WebSocket completed!")
                DispatchQueue.main.async {
                    self.isProcessing = false
                    self.isComplete = true
                    self.reportKey = self.webSocket.reportKey
                    self.saveState() // Save state when complete
                }
                break
            }
            
            if let error = webSocket.error {
                print("❌ WebSocket error: \(error)")
                DispatchQueue.main.async {
                    self.isProcessing = false
                    self.saveState() // Save state after error
                }
                break
            }
            
            // Check for timeout
            timeoutCounter += 1
            if timeoutCounter > maxTimeout {
                print("⏰ WebSocket timeout - no messages received for 60 seconds")
                print("⏰ Timeout counter: \(timeoutCounter), max: \(maxTimeout)")
                print("⏰ WebSocket connection status: \(webSocket.connectionStatus)")
                print("⏰ WebSocket isComplete: \(webSocket.isComplete)")
                DispatchQueue.main.async {
                    self.isProcessing = false
                    self.saveState()
                    print("❌ Audit timed out - no WebSocket messages received")
                }
                break
            }
            
            // Log progress every 10 seconds
            if timeoutCounter % 20 == 0 {
                print("🔄 WebSocket monitoring: \(timeoutCounter * 500)ms elapsed")
                print("🔄 Connection status: \(webSocket.connectionStatus)")
                print("🔄 Is complete: \(webSocket.isComplete)")
            }
            
            // Save state periodically during processing
            DispatchQueue.main.async {
                self.saveState()
            }
            
            try? await Task.sleep(for: .milliseconds(500))
        }
        
        print("🔄 WebSocket monitoring ended")
        print("🔄 Final state - isProcessing: \(isProcessing), isComplete: \(isComplete)")
    }
    
    private func openReport() {
        print("🔥🔥🔥 DEBUG: openReport() called! 🔥🔥🔥")
        print("🔥 DEBUG: runId = '\(runId)'")
        print("🔥 DEBUG: isComplete = \(isComplete)")
        print("🔥 DEBUG: reportKey = '\(reportKey ?? "nil")'")
        print("🔥 DEBUG: webSocket.reportKey = '\(webSocket.reportKey ?? "nil")'")
        print("🔥 DEBUG: webSocket.summary = '\(webSocket.summary ?? "nil")'")
        print("🔥 DEBUG: webSocket.findingsCount = \(webSocket.findingsCount)")
        print("🔥 DEBUG: webSocket.isComplete = \(webSocket.isComplete)")
        print("🔥 DEBUG: webSocket.connectionStatus = \(webSocket.connectionStatus)")
        print("🔥 DEBUG: isProcessing = \(isProcessing)")
        
        // Force completion for testing if WebSocket isn't working
        if !isComplete && !webSocket.isComplete {
            print("⚠️ WARNING: Audit not marked as complete, but proceeding anyway for testing")
        }
        
        guard !runId.isEmpty else {
            print("❌ No run ID available")
            return
        }
        
        print("🔍 Opening report for run ID: \(runId)")
        
        Task {
            do {
                let reportURL = URL(string: "https://auditor-edge.evanhaque1.workers.dev/runs/\(runId)/report")!
                print("🌐 Fetching report URL: \(reportURL)")
                
                let (data, response) = try await URLSession.shared.data(from: reportURL)
                
                if let httpResponse = response as? HTTPURLResponse {
                    print("📡 Response status: \(httpResponse.statusCode)")
                    print("📡 Response headers: \(httpResponse.allHeaderFields)")
                    
                    if let responseString = String(data: data, encoding: .utf8) {
                        print("📄 Response body: \(responseString)")
                    }
                    
                    if httpResponse.statusCode == 200,
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        
                        print("📊 JSON response: \(json)")
                        
                        if let reportUrlString = json["reportUrl"] as? String {
                            // Redirect to localhost Next.js frontend for development
                            let nextjsUrl = URL(string: "http://localhost:3000/display?reportUrl=\(reportUrlString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")!
                            
                            print("✅ Opening Next.js report page: \(nextjsUrl)")
                            NSWorkspace.shared.open(nextjsUrl)
                        } else {
                            print("❌ Failed to extract reportUrl from JSON")
                            print("❌ JSON keys: \(Array(json.keys))")
                        }
                    } else {
                        print("❌ HTTP request failed with status: \(httpResponse.statusCode)")
                        if let responseString = String(data: data, encoding: .utf8) {
                            print("📄 Error response body: \(responseString)")
                        }
                        
                        // If report isn't ready, show a message to the user
                        print("⚠️ Report not ready yet. The audit is still in progress.")
                    }
                } else {
                    print("❌ Invalid HTTP response")
                }
            } catch {
                print("❌ Error opening report: \(error)")
                print("❌ Error details: \(error.localizedDescription)")
            }
        }
    }
    
    private func pollAuditStatus(runId: String) async {
        print("🔍 Polling audit status for run: \(runId)")
        print("🔍 Starting polling with current state - isProcessing: \(isProcessing), isComplete: \(isComplete)")
        
        var attempts = 0
        let maxAttempts = 60 // Poll for up to 5 minutes (60 * 5s = 5min)
        
        while isProcessing && !isComplete && attempts < maxAttempts {
            print("🔍 Polling attempt \(attempts + 1)/\(maxAttempts)")
            
            do {
                let statusURL = URL(string: "https://auditor-edge.evanhaque1.workers.dev/runs/\(runId)/status")!
                print("🔍 Polling URL: \(statusURL)")
                
                let (data, response) = try await URLSession.shared.data(from: statusURL)
                
                if let httpResponse = response as? HTTPURLResponse {
                    print("🔍 Polling response status: \(httpResponse.statusCode)")
                    
                    if httpResponse.statusCode == 200 {
                        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                            print("📊 Polling response: \(json)")
                            
                            // Check if audit is complete
                            if let phase = json["phase"] as? String, phase == "done" {
                                print("✅ Audit completed via polling!")
                                DispatchQueue.main.async {
                                    self.isProcessing = false
                                    self.isComplete = true
                                    self.reportKey = json["reportKey"] as? String
                                    self.webSocket.summary = json["summary"] as? String
                                    self.webSocket.findingsCount = json["findingsCount"] as? Int ?? 0
                                    self.saveState()
                                }
                                return
                            }
                            
                            // Update progress
                            if let percent = json["percent"] as? Double {
                                DispatchQueue.main.async {
                                    self.webSocket.progress = percent / 100.0
                                }
                            }
                            
                            if let message = json["lastMessage"] as? String {
                                DispatchQueue.main.async {
                                    self.webSocket.currentPhase = message
                                }
                            }
                        } else {
                            print("❌ Failed to parse polling response as JSON")
                        }
                    } else {
                        print("❌ Polling failed with status: \(httpResponse.statusCode)")
                        if let responseString = String(data: data, encoding: .utf8) {
                            print("📄 Error response: \(responseString)")
                        }
                    }
                } else {
                    print("❌ Invalid HTTP response")
                }
            } catch {
                print("❌ Error polling status: \(error)")
            }
            
            attempts += 1
            print("🔍 Waiting 5 seconds before next poll...")
            try? await Task.sleep(for: .seconds(5))
        }
        
        if attempts >= maxAttempts {
            print("⏰ Polling timeout - audit didn't complete in 5 minutes")
            DispatchQueue.main.async {
                self.isProcessing = false
                self.saveState()
            }
        }
    }
    
    private func resetAudit() {
        print("🗑️ Resetting audit state...")
        isProcessing = false
        isComplete = false
        runId = ""
        progress = 0.0
        currentPhase = ""
        reportKey = nil
        webSocket.disconnect()
        
        // Clear WebSocket state
        webSocket.isComplete = false
        webSocket.progress = 0.0
        webSocket.currentPhase = ""
        webSocket.reportKey = nil
        webSocket.summary = nil
        webSocket.findingsCount = 0
        webSocket.error = nil
        
        // Clear saved state
        UserDefaults.standard.removeObject(forKey: "audit_runId")
        UserDefaults.standard.removeObject(forKey: "audit_isProcessing")
        UserDefaults.standard.removeObject(forKey: "audit_isComplete")
        UserDefaults.standard.removeObject(forKey: "audit_reportKey")
        UserDefaults.standard.removeObject(forKey: "audit_currentPhase")
        UserDefaults.standard.removeObject(forKey: "audit_progress")
        print("🗑️ Cleared saved audit state - back to 'Run Audit'")
    }
    
    private func checkJobStatus(runId: String) async {
        print("🔍 Checking job status for run: \(runId)")
        
        // Update progress to show we're checking
        DispatchQueue.main.async {
            self.currentPhase = "Verifying job creation..."
            self.progress = 0.1
        }
        
        // Poll the job queue to see if our job was created
        var attempts = 0
        let maxAttempts = 10
        
        while attempts < maxAttempts {
            do {
                let statusURL = URL(string: "https://auditor-edge.evanhaque1.workers.dev/runs/\(runId)/status")!
                let (data, response) = try await URLSession.shared.data(from: statusURL)
                
                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let status = json["status"] as? String {
                        print("📊 Run status: \(status)")
                        
                        DispatchQueue.main.async {
                            self.currentPhase = "Job created - Processing..."
                            self.progress = 0.3
                        }
                        
                        // Job was created successfully
                        await simulateProcessing()
                        return
                    }
                }
            } catch {
                print("❌ Error checking job status: \(error)")
            }
            
            attempts += 1
            try? await Task.sleep(for: .seconds(1))
        }
        
        // If we get here, the job wasn't created
        print("❌ Job was not created after \(maxAttempts) attempts")
        DispatchQueue.main.async {
            self.currentPhase = "Job creation failed"
            self.progress = 0.0
        }
        
        // Wait a bit then reset
        try? await Task.sleep(for: .seconds(2))
        DispatchQueue.main.async {
            self.isProcessing = false
            self.runId = ""
            self.progress = 0.0
            self.currentPhase = ""
        }
    }
    
    private func simulateProcessing() async {
        let phases = [
            ("Processing with AI...", 0.5),
            ("Extracting text...", 0.7),
            ("Generating embeddings...", 0.8),
            ("Running audit checks...", 0.9),
            ("Generating report...", 1.0)
        ]
        
        for (phase, progressValue) in phases {
            DispatchQueue.main.async {
                self.currentPhase = phase
                self.progress = progressValue
            }
            
            try? await Task.sleep(for: .seconds(3))
        }
        
        // Complete
        DispatchQueue.main.async {
            self.isProcessing = false
            self.runId = ""
            self.progress = 0.0
            self.currentPhase = ""
        }
        
        print("🎯 Audit process completed")
    }
    
    private func uploadFile(_ fileURL: URL) async throws -> UploadResponse {
        // Determine content type
        let contentType = fileURL.pathExtension.lowercased() == "csv" ? "text/csv" : "application/pdf"
        NSLog("📄 Content type: \(contentType)")
        
        // Step 1: Create upload
        NSLog("🔄 Step 1: Creating upload request...")
        let createURL = URL(string: "https://auditor-edge.evanhaque1.workers.dev/uploads/create")!
        var request = URLRequest(url: createURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "filename": fileURL.lastPathComponent,
            "contentType": contentType,
            "tenantId": "notch_app_user"
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        // Check response status
        if let httpResponse = response as? HTTPURLResponse {
            NSLog("📡 Upload create response: \(httpResponse.statusCode)")
            if httpResponse.statusCode != 200 && httpResponse.statusCode != 201 {
                let errorText = String(data: data, encoding: .utf8) ?? "Unknown error"
                NSLog("❌ Upload create failed: \(errorText)")
                throw NSError(domain: "UploadError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to create upload: \(errorText)"])
            }
        }
        
        let uploadResp = try JSONDecoder().decode(UploadResponse.self, from: data)
        NSLog("✅ Upload created: \(uploadResp.runId)")
        
        // Step 2: Upload to backend direct endpoint
        NSLog("🔄 Step 2: Uploading to backend...")
        let fileData = try Data(contentsOf: fileURL)
        NSLog("📦 File size: \(fileData.count) bytes")
        NSLog("🔗 Backend URL: \(uploadResp.r2PutUrl)")
        
        var uploadRequest = URLRequest(url: URL(string: uploadResp.r2PutUrl)!)
        uploadRequest.httpMethod = "POST"
        uploadRequest.setValue(contentType, forHTTPHeaderField: "Content-Type")
        uploadRequest.httpBody = fileData
        
        NSLog("🚀 Sending upload request...")
        do {
            let (uploadData, uploadResponse) = try await URLSession.shared.data(for: uploadRequest)
            
            // Check upload response
            if let httpResponse = uploadResponse as? HTTPURLResponse {
                NSLog("📡 Upload response: \(httpResponse.statusCode)")
                if httpResponse.statusCode != 200 {
                    let errorText = String(data: uploadData, encoding: .utf8) ?? "Unknown error"
                    NSLog("❌ Upload failed: \(errorText)")
                    throw NSError(domain: "UploadError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to upload file: \(errorText)"])
                }
            }
            NSLog("✅ Upload successful")
        } catch {
            NSLog("❌ Upload error: \(error)")
            throw error
        }
        
        // Step 3: Enqueue for processing
        NSLog("🔄 Step 3: Enqueuing job for processing...")
        let enqueueURL = URL(string: "https://auditor-edge.evanhaque1.workers.dev/runs/\(uploadResp.runId)/enqueue")!
        var enqueueRequest = URLRequest(url: enqueueURL)
        enqueueRequest.httpMethod = "POST"
        enqueueRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let enqueueBody: [String: Any] = ["r2Key": uploadResp.r2Key]
        enqueueRequest.httpBody = try JSONSerialization.data(withJSONObject: enqueueBody)
        
        let (enqueueData, enqueueResponse) = try await URLSession.shared.data(for: enqueueRequest)
        
        // Check if enqueue was successful
        if let httpResponse = enqueueResponse as? HTTPURLResponse {
            NSLog("📡 Enqueue response: \(httpResponse.statusCode)")
            if httpResponse.statusCode != 200 {
                let errorText = String(data: enqueueData, encoding: .utf8) ?? "Unknown error"
                NSLog("❌ Enqueue failed: \(errorText)")
                throw NSError(domain: "UploadError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to enqueue job: \(errorText)"])
            }
        }
        
        let enqueueResponseText = String(data: enqueueData, encoding: .utf8) ?? "No response"
        NSLog("✅ Job enqueued successfully: \(enqueueResponseText)")
        
        return uploadResp
    }
}

struct UploadResponse: Codable {
    let runId: String
    let r2PutUrl: String
    let r2Key: String
}

