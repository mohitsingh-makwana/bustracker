import Icon from "./Icon";

export default function InputField({
    id,
    label,
    icon,
    type = "text",
    value,
    onChange,
    placeholder = "",
    autoComplete,
    required = false,
    inputMode,
    maxLength,
    minLength,
    error,
    hint,
    rightControl,
    disabled = false,
    name,
}) {
    return (
        <div className="form-field">
            <label htmlFor={id}>{label}</label>
            <div className={`form-input-wrap ${error ? "form-input-wrap--error" : ""} ${disabled ? "form-input-wrap--disabled" : ""}`}>
                {icon && <Icon name={icon} size={19} className="form-input-icon" />}
                <input
                    id={id}
                    name={name || id}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required={required}
                    inputMode={inputMode}
                    maxLength={maxLength}
                    minLength={minLength}
                    disabled={disabled}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
                />
                {rightControl}
            </div>
            {hint && !error && <small className="field-hint" id={`${id}-hint`}>{hint}</small>}
            {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
        </div>
    );
}
