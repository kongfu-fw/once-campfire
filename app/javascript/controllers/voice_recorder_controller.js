import { Controller } from "@hotwired/stimulus"
import FileUploader from "models/file_uploader"

export default class extends Controller {
  static targets = [ "panel", "recording", "preview", "audio", "timer", "previewTimer", "recordBtn", "startIcon", "stopIcon", "playIcon", "pauseIcon" ]
  static values = { formUrl: String }
  static outlets = [ "messages" ]

  #mediaRecorder
  #chunks = []
  #timerInterval
  #startTime
  #recordedBlob
  #recordedUrl
  #recordingDurationSeconds = 0
  #isDiscarding = false

  connect() {
    // Audio event listeners are now handled via data-actions on the audio tag
  }

  disconnect() {
    this.#cleanup()
  }

  toggle() {
    if (this.panelTarget.hidden) {
      this.panelTarget.hidden = false
    } else {
      this.#reset()
    }
  }

  toggleRecording(event) {
    event.preventDefault()
    if (this.#mediaRecorder && this.#mediaRecorder.state === "recording") {
      this.stopRecording()
    } else {
      this.startRecording()
    }
  }

  startRecording() {
    if (this.#mediaRecorder && this.#mediaRecorder.state === "recording") return

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microphone access is unavailable. This usually happens if you are not using HTTPS or localhost.")
      return
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      this.#chunks = []

      const mimeType = this.#getSupportedMimeType()
      const options = { audioBitsPerSecond: 16000 }
      if (mimeType) options.mimeType = mimeType

      this.#mediaRecorder = new MediaRecorder(stream, options)

      this.#mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.#chunks.push(event.data)
        }
      }

      this.#mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        if (this.#isDiscarding) {
          this.#isDiscarding = false
          this.#reset()
          this.recordBtnTarget.classList.remove("voice-recorder__record-btn--active")
        } else {
          this.#processRecording()
        }
      }

      this.#mediaRecorder.start()
      this.#startTimer()

      this.recordBtnTarget.classList.add("voice-recorder__record-btn--active")
      this.startIconTarget.hidden = true
      this.stopIconTarget.hidden = false
    }).catch(() => {
      // Permission denied or no microphone
    })
  }

  stopRecording() {
    if (this.#mediaRecorder && this.#mediaRecorder.state === "recording") {
      this.#mediaRecorder.stop()
      this.#stopTimer()
      this.recordBtnTarget.classList.remove("voice-recorder__record-btn--active")
      this.startIconTarget.hidden = false
      this.stopIconTarget.hidden = true
    }
  }

  playPreview() {
    const audio = this.audioTarget
    if (audio.paused) {
      if (audio.currentTime >= audio.duration) audio.currentTime = 0
      audio.play()
    } else {
      audio.pause()
    }
  }

  onPlay() {
    this.playIconTarget.hidden = true
    this.pauseIconTarget.hidden = false
  }

  onPause() {
    this.playIconTarget.hidden = false
    this.pauseIconTarget.hidden = true
  }

  onEnded() {
    this.playIconTarget.hidden = false
    this.pauseIconTarget.hidden = true
    this.previewTimerTarget.textContent = this.#formatTime(this.#recordingDurationSeconds)
  }

  onTimeUpdate() {
    if (!this.audioTarget.paused) {
      this.previewTimerTarget.textContent = this.#formatTime(Math.floor(this.audioTarget.currentTime))
    }
  }

  discard() {
    if (this.#mediaRecorder && this.#mediaRecorder.state === "recording") {
      this.#isDiscarding = true
      this.#mediaRecorder.stop()
    } else {
      this.#reset()
      this.recordBtnTarget.classList.remove("voice-recorder__record-btn--active")
    }
  }

  async send() {
    if (!this.#recordedBlob) return

    const mimeType = this.#recordedBlob.type
    const extension = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "ogg"
    const file = new File([ this.#recordedBlob ], `voice_message_${this.#recordingDurationSeconds}s.${extension}`, { type: mimeType })

    const clientMessageId = Math.random().toString(36).slice(2)
    const uploader = new FileUploader(file, this.formUrlValue, clientMessageId, this.#uploadProgress.bind(this))

    const body = this.#pendingUploadBody()
    this.messagesOutlet.insertPendingMessage(clientMessageId, body)

    this.audioTarget.pause()
    this.#reset()

    try {
      const resp = await uploader.upload()
      Turbo.renderStreamMessage(resp)
    } catch {
      this.messagesOutlet.failPendingMessage(clientMessageId)
    }
  }

  // Private

  #processRecording() {
    const mimeType = this.#mediaRecorder?.mimeType || "audio/webm"
    this.#recordedBlob = new Blob(this.#chunks, { type: mimeType })
    this.#revokeUrl()
    this.#recordedUrl = URL.createObjectURL(this.#recordedBlob)

    this.audioTarget.src = this.#recordedUrl
    this.recordingTarget.hidden = true
    this.previewTarget.hidden = false

    this.previewTimerTarget.textContent = this.#formatTime(this.#recordingDurationSeconds)
  }

  #startTimer() {
    this.#startTime = Date.now()
    this.timerTarget.textContent = "0:00"

    this.#timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.#startTime) / 1000)
      this.timerTarget.textContent = this.#formatTime(elapsed)

      if (elapsed >= 59) {
        this.stopRecording()
      }
    }, 1000)
  }

  #stopTimer() {
    if (this.#timerInterval) {
      clearInterval(this.#timerInterval)
      this.#timerInterval = null
    }
    if (this.#startTime) {
      this.#recordingDurationSeconds = Math.floor((Date.now() - this.#startTime) / 1000)
    }
  }

  #formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  #getSupportedMimeType() {
    const types = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/webm",
      "audio/mp4;codecs=opus",
      "audio/mp4"
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }

    return null
  }

  #uploadProgress(percent, clientMessageId) {
    this.messagesOutlet.updatePendingMessage(clientMessageId, this.#pendingUploadBody(percent))
  }

  #pendingUploadBody(percent = 0) {
    return `
      <div class="message__pending-upload flex align-center gap" style="--percentage: ${percent}%">
        <div class="voice-message__icon-small">🎤</div>
        <div>Voice message - <span>${percent}%</span></div>
      </div>
    `
  }

  #revokeUrl() {
    if (this.#recordedUrl) {
      URL.revokeObjectURL(this.#recordedUrl)
      this.#recordedUrl = null
    }
  }

  #reset() {
    this.#stopTimer()
    this.#revokeUrl()
    this.#recordedBlob = null
    this.#chunks = []
    this.panelTarget.hidden = true
    this.previewTarget.hidden = true
    this.recordingTarget.hidden = false
    this.timerTarget.textContent = "0:00"
    if (this.hasStartIconTarget) this.startIconTarget.hidden = false
    if (this.hasStopIconTarget) this.stopIconTarget.hidden = true
    this.audioTarget.src = ""
  }

  #cleanup() {
    this.#stopTimer()
    this.#revokeUrl()

    if (this.#mediaRecorder && this.#mediaRecorder.state === "recording") {
      this.#mediaRecorder.stop()
    }
  }
}
