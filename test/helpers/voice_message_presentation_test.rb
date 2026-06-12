require "test_helper"

class Messages::VoiceMessagePresentationTest < ActionDispatch::IntegrationTest
  include ActionDispatch::TestProcess

  setup do
    host! "once.campfire.test"

    sign_in :david
    @room = rooms(:watercooler)
  end

  test "audio attachment renders voice message player" do
    message = create_voice_message

    get room_message_url(@room, message)
    assert_response :success
    assert_select ".voice-message"
    assert_select ".voice-message__play-btn"
    assert_select ".voice-message__waveform"
  end

  test "image attachment does not render voice message player" do
    message = create_image_message

    get room_message_url(@room, message)
    assert_response :success
    assert_select ".voice-message", count: 0
  end


  private
    def create_voice_message
      @room.messages.create_with_attachment! \
        creator: users(:david),
        client_message_id: "voice_pres",
        attachment: fixture_file_upload("voice_message.webm", "audio/webm")
    end

    def create_image_message
      @room.messages.create_with_attachment! \
        creator: users(:david),
        client_message_id: "image_pres",
        attachment: fixture_file_upload("moon.jpg", "image/jpeg")
    end
end
