import { useState, useEffect } from "react";
// eslint-disable-next-line import/no-unresolved
import { useNavigate } from "@remix-run/react";
// import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { UserLogsDialog } from "~/components/UserLogsDialog";
import { SignDialog } from "~/components/SignDialog";
import { SignReqHistoryDialog } from "~/components/SignReqHistoryDialog";

interface User {
    id: string;
    email: string;
    passkeyEnabled: boolean;
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

async function getWalletAddress() {
    const response = await fetch("/api/wallet", {
        method: "GET"
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
    const [walletAddress, setWalletAddress] = useState<string>("");
    const [userLogsOpen, setUserLogsOpen] = useState(false);
    const [signDialogOpen, setSignDialogOpen] = useState(false);
    const [signReqHistoryOpen, setSignReqHistoryOpen] = useState(false);

    const navigate = useNavigate();

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
                getWalletAddress().then((data) => {
                    setWalletAddress(data.walletAddress);
                }).catch((error) => {
                    console.log("Failed to get wallet address:", error);
                });
            }
        }).catch((error) => {
            console.log("Failed to verify token:", error);
            navigate('/login');
        });
    }, [verifyToken, getWalletAddress]);

    return (
        <div className="max-w-4xl mx-auto mt-10">
            <h1 className="text-4xl font-bold text-black">Dashboard</h1>

            <div className="mt-8 p-6 bg-white shadow rounded-lg text-black flex">
                <div className="flex-1">
                    <h2 className="text-2xl font-semibold">User Information</h2>
                    <div className="mt-4 space-y-4">
                        <div>
                            <p className="text-lg mt-2">
                                <span className="font-medium">Email:</span> {user.email}
                            </p>
                            <p className="text-lg mt-2">
                                <span className="font-medium">Polygon Wallet Address:</span> {walletAddress}
                            </p>
                        </div>
                        <div>
                            <button
                                onClick={() => setSignDialogOpen(true)}
                                className="mt-2 px-6 py-2 w-[60%] bg-black text-white rounded hover:bg-gray-800"
                            >
                                Sign Message / Transaction
                            </button>
                            <SignDialog open={signDialogOpen} closeDialog={() => setSignDialogOpen(false)} />
                        </div>
                        <div>
                            <button
                                onClick={() => setSignReqHistoryOpen(true)}
                                className="mt-2 px-6 py-2 w-[60%] bg-black text-white rounded hover:bg-gray-800"
                            >
                                Signature Requests History
                            </button>
                            <SignReqHistoryDialog open={signReqHistoryOpen} closeDialog={() => setSignReqHistoryOpen(false)} />
                        </div>
                        <div>
                            <button
                                onClick={() => setUserLogsOpen(true)}
                                className="mt-2 px-6 py-2 w-[60%] bg-black text-white rounded hover:bg-gray-800"
                            >
                                User Logs
                            </button>
                            <UserLogsDialog open={userLogsOpen} closeDialog={() => setUserLogsOpen(false)} />
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={() => logout().then(() => {
                                    alert("Logged out successfully");
                                    navigate("/login");
                                })}
                                className="mt-2 px-6 py-2 w-[60%] bg-black text-white rounded hover:bg-gray-800"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-4 mr-20 flex justify-center items-center">
                    {
                        walletAddress === "" ? 
                        <p>Loading ... </p> :
                        <QRCodeSVG
                            value={walletAddress}
                            size={200}
                        />
                    }
                </div>
            </div>
        </div>
    );
}
