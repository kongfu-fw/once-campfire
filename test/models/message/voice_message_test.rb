require "test_helper"

class Message::VoiceMessageTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper
  include ActionDispatch::TestProcess

  test "creating a voice message with audio attachment" do
    message = create_voice_message
    assert message.attachment?
    assert message.attachment.content_type.start_with?("audio/")
  end

  test "voice message uses filename as plain text body" do
    message = create_voice_message
    assert_equal "voice_message.webm", message.plain_text_body
  end

  test "voice message content type is attachment" do
    message = create_voice_message
    assert message.content_type.attachment?
  end


  private
    def create_voice_message
      rooms(:hq).messages.create_with_attachment! \
        creator: users(:david),
        client_message_id: "voice_msg",
        attachment: fixture_file_upload("voice_message.webm", "audio/webm")
    end
end
