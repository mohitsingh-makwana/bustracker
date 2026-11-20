const variantClasses = {
    amber: "button--amber",
    outline: "button--outline",
    navy: "button--navy",
    request: "button--request",
    disabled: "button--disabled",
    rejected: "button--rejected",
};

export default function Button({
    variant = "amber",
    size,
    full = false,
    className = "",
    children,
    type = "button",
    ...props
}) {
    const classes = [
        "button",
        variantClasses[variant] || variantClasses.amber,
        size ? `button--${size}` : "",
        full ? "button--full" : "",
        className,
    ].filter(Boolean).join(" ");

    return <button type={type} className={classes} {...props}>{children}</button>;
}
