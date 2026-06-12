class Messages::VoiceMessagePresentation
  def initialize(message, context:)
    @message, @context = message, context
  end

  def render
    tag.div class: "voice-message", data: {
      controller: "voice-message",
      voice_message_url_value: audio_url,
      voice_message_id_value: message.id
    } do
      play_button + waveform + duration + unplayed_dot
    end
  end

  private
    attr_reader :message, :context
    delegate :tag, :image_tag, :rails_blob_path, to: :context

    def play_button
      tag.button class: "voice-message__play-btn btn btn--plain", data: { action: "voice-message#play" } do
        tag.span("▶", class: "voice-message__play-icon", data: { voice_message_target: "playIcon" }) +
        tag.span("Play voice message", class: "for-screen-reader")
      end
    end

    def waveform
      bars = (1..12).map { |i|
        tag.span class: "voice-message__bar", style: "--bar-index: #{i}"
      }.join.html_safe

      tag.div class: "voice-message__waveform" do
        bars
      end
    end

    def duration
      tag.span "0:00", class: "voice-message__duration txt-small txt-subtle", data: { voice_message_target: "duration" }
    end

    def unplayed_dot
      tag.span class: "voice-message__unplayed-dot", data: { voice_message_target: "dot" }
    end

    def audio_url
      rails_blob_path message.attachment, only_path: true
    end
end
