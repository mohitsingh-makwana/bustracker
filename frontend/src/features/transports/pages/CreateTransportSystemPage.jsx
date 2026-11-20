import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import BrandLogo from "../../../components/common/BrandLogo";
import Icon from "../../../components/common/Icon";
import Button from "../../../components/common/Button";
import { createTransportSystem } from "../services/transportService";
import "../../../styles/create-transport-system.css";

function errorMessage(error) {
    return error?.response?.data?.message || error?.response?.data?.msg || error?.response?.data?.error || error?.message || "Couldn't create your transport system. Please try again.";
}

export default function CreateTransportSystemPage() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ transportCode: "", name: "", description: "", accessType: "PUBLIC", city: "", area: "", latitude: "", longitude: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function change(event) {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
        setError("");
    }

    async function submit(event) {
        event.preventDefault();
        if (!isAuthenticated) {
            navigate("/login", { state: { returnTo: "/transport-systems/create", authNotice: "Log in to create a transport system." } });
            return;
        }
        setError("");
        setLoading(true);
        const payload = {
            transportCode: form.transportCode.trim(),
            name: form.name.trim(),
            description: form.description.trim() || null,
            accessType: form.accessType,
            city: form.city.trim(),
            area: form.area.trim() || null,
            latitude: form.latitude.trim() === "" ? null : Number(form.latitude),
            longitude: form.longitude.trim() === "" ? null : Number(form.longitude),
        };
        try {
            const created = await createTransportSystem(payload);
            navigate("/", {
                replace: true,
                state: {
                    createdTransportSystem: created,
                    authNotice: `“${created?.name ?? payload.name}” was created. It should now appear under My systems with your Admin membership. Select it there to enter the admin workspace.`,
                },
            });
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    if (!isAuthenticated) {
        return <main className="create-system-page"><section className="create-system-card create-system-locked"><BrandLogo size="lg"/><div className="create-system-icon"><Icon name="lock" size={26}/></div><h1>Log in to create a system</h1><p>Creating a transport system requires your user account. After creation, you can open it from My systems as its administrator.</p><Button full onClick={() => navigate("/login", { state: { returnTo: "/transport-systems/create", authNotice: "Log in to create a transport system." } })}>Log in to continue</Button><Link to="/">Back to home</Link></section></main>;
    }

    return <main className="create-system-page">
        <section className="create-system-card">
            <header className="create-system-header"><Link to="/" className="create-system-back" aria-label="Back to home"><Icon name="arrow-left" size={21}/></Link><BrandLogo/><span className="create-system-user"><Icon name="shield-check" size={15}/> Admin setup</span></header>
            <div className="create-system-intro"><div className="create-system-icon"><Icon name="bus" size={27}/></div><p className="create-system-eyebrow">START A TRANSPORT NETWORK</p><h1>Create your transport system</h1><p>Set up your network. Your account will be used to access its Admin workspace after creation.</p></div>
            <form className="create-system-form" onSubmit={submit}>
                <label>Transport code <span>*</span><input name="transportCode" value={form.transportCode} onChange={change} required maxLength={30} placeholder="e.g. INDORE-CITY" autoComplete="off"/><small>Up to 30 characters. Must be unique.</small></label>
                <label>Transport system name <span>*</span><input name="name" value={form.name} onChange={change} required maxLength={150} placeholder="e.g. Indore City Bus"/></label>
                <label>Description<textarea name="description" value={form.description} onChange={change} maxLength={500} rows={3} placeholder="Tell passengers and team members about your network (optional)"/><small>{form.description.length}/500 characters</small></label>
                <fieldset><legend>Access type <span>*</span></legend><div className="create-system-access-options"><label className={form.accessType === "PUBLIC" ? "is-selected" : ""}><input type="radio" name="accessType" value="PUBLIC" checked={form.accessType === "PUBLIC"} onChange={change}/><Icon name="globe" size={19}/><span><strong>Public</strong><small>Anyone can discover the system.</small></span></label><label className={form.accessType === "PRIVATE" ? "is-selected" : ""}><input type="radio" name="accessType" value="PRIVATE" checked={form.accessType === "PRIVATE"} onChange={change}/><Icon name="lock" size={19}/><span><strong>Private</strong><small>Members need access approval.</small></span></label></div></fieldset>
                <div className="create-system-location-heading"><h2>Location</h2><span>Coordinates are optional</span></div>
                <div className="create-system-two-col"><label>City <span>*</span><input name="city" value={form.city} onChange={change} required maxLength={100} placeholder="e.g. Indore"/></label><label>Area<input name="area" value={form.area} onChange={change} maxLength={100} placeholder="e.g. Vijay Nagar"/></label></div>
                <div className="create-system-two-col"><label>Latitude<input type="number" name="latitude" value={form.latitude} onChange={change} min={-90} max={90} step="any" placeholder="22.7196"/></label><label>Longitude<input type="number" name="longitude" value={form.longitude} onChange={change} min={-180} max={180} step="any" placeholder="75.8577"/></label></div>
                {error && <div className="create-system-error" role="alert"><Icon name="alert" size={18}/>{error}</div>}
                <div className="create-system-submit-note"><Icon name="shield-check" size={18}/><span>Your user token is used for creation. The backend must create your Admin membership for the new system.</span></div>
                <Button type="submit" full size="large" disabled={loading || !form.transportCode.trim() || !form.name.trim() || !form.city.trim()}>{loading ? <><span className="button-spinner"/>Creating system…</> : <>Create transport system <Icon name="arrow-right" size={18}/></>}</Button>
                <Link className="create-system-cancel" to="/">Cancel and return home</Link>
            </form>
        </section>
    </main>;
}
