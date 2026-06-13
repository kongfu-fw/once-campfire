import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { url: String, id: Number }
  static targets = [ "dot", "duration", "playIcon" ]

  #audio

  connect() {
    if (this.#played) {
      this.dotTarget.hidden = true
    }

    this.#loadDuration()

    this.handlePlayingEvent = this.handlePlayingEvent.bind(this)
    window.addEventListener("voice-message:playing", this.handlePlayingEvent)
  }

  disconnect() {
    window.removeEventListener("voice-message:playing", this.handlePlayingEvent)
    if (this.#audio) {
      this.#audio.pause()
      this.#audio = null
    }
  }

  handlePlayingEvent(event) {
    if (event.detail.id !== this.idValue && this.#audio && !this.#audio.paused) {
      this.#audio.pause()
      this.#audio.currentTime = 0
      this.playIconTarget.textContent = "▶"
      this.element.classList.remove("is-playing")
    }
  }

  play() {
    if (this.#audio && !this.#audio.paused) {
      this.#audio.pause()
      this.playIconTarget.textContent = "▶"
      return
    }

    if (!this.#audio || this.#audio.ended) {
      this.#audio = new Audio(this.urlValue)
      this.#audio.addEventListener("ended", () => {
        this.playIconTarget.textContent = "▶"
        this.element.classList.remove("is-playing")
      })
      this.#audio.addEventListener("pause", () => {
        this.element.classList.remove("is-playing")
      })
      this.#audio.addEventListener("play", () => {
        this.element.classList.add("is-playing")
      })
    }

    window.dispatchEvent(new CustomEvent("voice-message:playing", { detail: { id: this.idValue } }))

    this.playIconTarget.textContent = "⏸"
    this.#audio.play()
    this.#markAsPlayed()
  }

  // Private

  get #played() {
    return localStorage.getItem(`voice_played_${this.idValue}`)
  }

  #markAsPlayed() {
    localStorage.setItem(`voice_played_${this.idValue}`, "1")
    this.dotTarget.hidden = true
  }

  #renderDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    this.durationTarget.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  #loadDuration() {
    const urlMatch = this.urlValue.match(/voice_message_(\d+)s/)
    if (urlMatch) {
      this.#renderDuration(parseInt(urlMatch[1], 10))
      return
    }

    const audio = new Audio()
    audio.preload = "metadata"
    audio.src = this.urlValue

    audio.addEventListener("loadedmetadata", () => {
      if (isFinite(audio.duration)) {
        this.#renderDuration(Math.round(audio.duration))
      }
    }, { once: true })
  }
}
