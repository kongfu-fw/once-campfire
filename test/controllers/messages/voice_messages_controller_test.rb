require "test_helper"

class Messages::VoiceMessagesControllerTest < ActionDispatch::IntegrationTest
  include ActionDispatch::TestProcess

  setup do
    host! "once.campfire.test"

    sign_in :david
    @room = rooms(:watercooler)
  end

  test "creating a voice message with audio attachment" do
    post room_messages_url(@room, format: :turbo_stream),
      params: { message: {
        attachment: fixture_file_upload("voice_message.webm", "audio/webm"),
        client_message_id: "voice_123"
      } }

    assert_rendered_turbo_stream_broadcast @room, :messages, action: "append", target: [ @room, :messages ] do
      assert_select ".voice-message"
    end
  end

  test "voice message broadcast contains play button" do
    post room_messages_url(@room, format: :turbo_stream),
      params: { message: {
        attachment: fixture_file_upload("voice_message.webm", "audio/webm"),
        client_message_id: "voice_456"
      } }

    assert_rendered_turbo_stream_broadcast @room, :messages, action: "append", target: [ @room, :messages ] do
      assert_select ".voice-message__play-btn"
      assert_select ".voice-message__waveform"
      assert_select ".voice-message__unplayed-dot"
    end
  end
end
