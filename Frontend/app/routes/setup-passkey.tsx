import { useNavigate } from "@remix-run/react";
// import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SetupPasskeyDialog } from "~/components/SetupPasskeyDialog";

async function verifyToken() {
    const response = await fetch("/api/user/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            "type": "token"
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to verify token");
    }

    return response.json();
}

export default function SetupPasskey() {
    const navigate = useNavigate();
    const [passkeyOpen, setPasskeyOpen] = useState(false);

    useEffect(() => {
        verifyToken().then((data) => {
            if (data.isValid) {
                navigate('/dashboard');
            }
            if (data.usage !== "registration in progress") {
                navigate('/signup');
            }
        }).catch(() => {
            console.log("need to login");
        });
    }, [navigate]);

    return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="text-center">
                <div className="mt-2">
                    <button
                        onClick={() => setPasskeyOpen(true)}
                        className="mt-4 px-6 py-2 w-[40%] bg-black text-white rounded hover:bg-gray-800"
                    >
                        Setup Passkey
                    </button>
                    <SetupPasskeyDialog open={passkeyOpen} closeDialog={() => setPasskeyOpen(false)} />
                </div>
            </div>
        </div>
    );
}
