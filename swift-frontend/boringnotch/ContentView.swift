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
    @State private var isProcessing = false
    @State private var runId = ""

    var body: some View {
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
    }

    var auditButton: some View {
        Rectangle()
            .fill(.white.opacity(0.1))
            .opacity(0.5)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay { auditLabel }
            .aspectRatio(1, contentMode: .fit)
            .contentShape(Rectangle())
    }
    
    var auditLabel: some View {
        VStack(spacing: 8) {
            Image(systemName: isProcessing ? "gearshape.2.fill" : "play.circle.fill")
                .font(.system(size: 24))
                .symbolEffect(.pulse, isActive: isProcessing)
            
            Text("Run Audit")
                .font(.system(.headline, design: .rounded))
        }
        .foregroundStyle(.gray)
        .contentShape(Rectangle())
        .onTapGesture {
            runAudit()
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
        guard !tvm.isEmpty else { 
            print("❌ No files to audit")
            return 
        }
        
        Task {
            isProcessing = true
            print("🚀 Starting audit process...")
            
            do {
                // Get the first file from the tray
                guard let firstItem = tvm.items.first else { 
                    print("❌ No file found in tray")
                    return 
                }
                let fileURL = firstItem.storageURL
                print("📁 Processing file: \(fileURL.lastPathComponent)")
                
                let response = try await uploadFile(fileURL)
                print("✅ Upload successful: \(response.runId)")
                runId = response.runId
                
                // Clear the tray after successful upload
                DispatchQueue.main.async {
                    tvm.removeAll()
                }
                
                // Reset after 3 seconds
                try await Task.sleep(for: .seconds(3))
                isProcessing = false
                runId = ""
                print("🎯 Audit process completed")
                
            } catch {
                print("❌ Audit failed: \(error)")
                print("❌ Error details: \(error.localizedDescription)")
                isProcessing = false
            }
        }
    }
    
    private func uploadFile(_ fileURL: URL) async throws -> UploadResponse {
        // Determine content type
        let contentType = fileURL.pathExtension.lowercased() == "csv" ? "text/csv" : "application/pdf"
        print("📄 Content type: \(contentType)")
        
        // Step 1: Create upload
        print("🔄 Step 1: Creating upload request...")
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
            print("📡 Upload create response: \(httpResponse.statusCode)")
            if httpResponse.statusCode != 200 {
                let errorText = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ Upload create failed: \(errorText)")
                throw NSError(domain: "UploadError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to create upload: \(errorText)"])
            }
        }
        
        let uploadResp = try JSONDecoder().decode(UploadResponse.self, from: data)
        print("✅ Upload created: \(uploadResp.runId)")
        
        // Step 2: Upload to R2
        print("🔄 Step 2: Uploading to R2...")
        let fileData = try Data(contentsOf: fileURL)
        print("📦 File size: \(fileData.count) bytes")
        
        var r2Request = URLRequest(url: URL(string: uploadResp.r2PutUrl)!)
        r2Request.httpMethod = "PUT"
        r2Request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        r2Request.httpBody = fileData
        
        let (r2Data, r2Response) = try await URLSession.shared.data(for: r2Request)
        
        // Check R2 upload response
        if let httpResponse = r2Response as? HTTPURLResponse {
            print("📡 R2 upload response: \(httpResponse.statusCode)")
            if httpResponse.statusCode != 200 {
                let errorText = String(data: r2Data, encoding: .utf8) ?? "Unknown error"
                print("❌ R2 upload failed: \(errorText)")
                throw NSError(domain: "UploadError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to upload to R2: \(errorText)"])
            }
        }
        print("✅ R2 upload successful")
        
        // Step 3: Enqueue for processing
        print("🔄 Step 3: Enqueuing job for processing...")
        let enqueueURL = URL(string: "https://auditor-edge.evanhaque1.workers.dev/runs/\(uploadResp.runId)/enqueue")!
        var enqueueRequest = URLRequest(url: enqueueURL)
        enqueueRequest.httpMethod = "POST"
        enqueueRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let enqueueBody: [String: Any] = ["r2Key": uploadResp.r2Key]
        enqueueRequest.httpBody = try JSONSerialization.data(withJSONObject: enqueueBody)
        
        let (enqueueData, enqueueResponse) = try await URLSession.shared.data(for: enqueueRequest)
        
        // Check if enqueue was successful
        if let httpResponse = enqueueResponse as? HTTPURLResponse {
            print("📡 Enqueue response: \(httpResponse.statusCode)")
            if httpResponse.statusCode != 200 {
                let errorText = String(data: enqueueData, encoding: .utf8) ?? "Unknown error"
                print("❌ Enqueue failed: \(errorText)")
                throw NSError(domain: "UploadError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to enqueue job: \(errorText)"])
            }
        }
        
        let enqueueResponseText = String(data: enqueueData, encoding: .utf8) ?? "No response"
        print("✅ Job enqueued successfully: \(enqueueResponseText)")
        
        return uploadResp
    }
}

struct UploadResponse: Codable {
    let runId: String
    let r2PutUrl: String
    let r2Key: String
}

