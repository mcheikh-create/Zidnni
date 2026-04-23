// Zidnni/frontend/src/components/Message.jsx
// Maqasid: حفظ العقل

export default function Message({ role, content }) {
  const isAssistant = role === 'assistant';
  const cls = 'message message--' + role;
  return (
    <div className={cls}>
      <div className="message__bubble">
        {isAssistant && (
          <span className="message__sender" aria-hidden="true">زدني</span>
        )}
        <p className="message__content">{content}</p>
      </div>
    </div>
  );
}
