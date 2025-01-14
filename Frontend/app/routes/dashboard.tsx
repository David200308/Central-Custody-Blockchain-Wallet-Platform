import { useState, useRef, useEffect } from "react";
// eslint-disable-next-line import/no-unresolved
import { useNavigate } from "@remix-run/react";
import { useQuery } from "@tanstack/react-query";
import { SetupPasskeyDialog } from "../components/SetupPasskeyDialog";

interface User {
    id: string;
    email: string;
    passkeyEnabled: boolean;
}

interface Logs {
    "log_id": number;
    "user_id": number;
    "log_time": string;
    "content": string;
}

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

export default function Dashboard() {
    const [user, setUser] = useState<User>({
        id: "",
        email: "",
        passkeyEnabled: false,
    });
    const [passkeyOpen, setPasskeyOpen] = useState(false);
    const [logs, setLogs] = useState<Logs[]>([]);

    const navigate = useNavigate();

    const fetchLogs = async () => {
        const logsResponse = await fetch('/api/user/logs');
        if (!logsResponse.ok) {
            throw new Error("Failed to fetch logs");
        }
        const logsData = await logsResponse.json();
        setLogs(logsData);
    };

    const logout = async () => {
        const response = await fetch("/api/user/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        });
    
        if (!response.ok) {
            throw new Error("Failed to logout");
        }
    
        return response.json();
    }

    useEffect(() => {
        verifyToken().then((data) => {
            if (data.isValid) {
                setUser(data.user);
                fetchLogs();
            }
        }).catch((error) => {
            console.log("Failed to verify token:", error);
            navigate('/login');
        });
    }, []);

    return (
        <div className="max-w-4xl mx-auto mt-10">
            <h1 className="text-4xl font-bold text-black">Dashboard</h1>

            <div className="mt-8 p-6 bg-white shadow rounded-lg text-black">
                <h2 className="text-2xl font-semibold">User Information</h2>
                <div className="mt-4">
                    <p className="text-lg mt-2">
                        <span className="font-medium">Email:</span> {user.email}
                    </p>
                    <p className="text-lg mt-2">
                        <span className="font-medium">Polygon Wallet Address :</span> 0x00000000
                    </p>
                    
                    <div className="mt-4">
                        <button
                            onClick={() => logout().then(() => {
                                alert("Logged out successfully");
                                navigate("/login");
                            })}
                            className="mt-4 px-6 py-2 w-[40%] bg-black text-white rounded hover:bg-gray-800"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8 p-6 shadow-lg rounded-lg text-black">
                <h2 className="text-3xl font-bold mb-4">User Logs</h2>
                <ul className="mt-4 space-y-4">
                    {logs && logs.map((log, index) => (
                        <li key={index} className="p-4 border-l-4 border-gray-400 rounded-lg">
                            <span className="font-semibold">Log Time:</span> <span>{
                                log.log_time.split("T")[0] + " " + log.log_time.split("T")[1].split(".")[0]
                            }</span>
                            <br />
                            <span className="font-semibold">Content:</span> <span>{log.content}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
