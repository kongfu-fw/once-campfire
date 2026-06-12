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
  }

  disconnect() {
    if (this.#audio) {
      this.#audio.pause()
      this.#audio = null
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
      })
    }

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
