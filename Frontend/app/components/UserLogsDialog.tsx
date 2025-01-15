import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

interface UserLogsDialogProps {
    open: boolean;
    closeDialog: () => void;
}

interface Logs {
    "log_id": number;
    "user_id": number;
    "log_time": string;
    "content": string;
}


export function UserLogsDialog({ open, closeDialog }: UserLogsDialogProps) {
    const [logs, setLogs] = useState<Logs[]>([]);

    const fetchLogs = async () => {
        const logsResponse = await fetch('/api/user/logs');
        if (!logsResponse.ok) {
            throw new Error("Failed to fetch logs");
        }
        const logsData = await logsResponse.json();
        setLogs(logsData);
    };

    useEffect(() => {
        fetchLogs().then((data) => {
            console.log("Fetched successfully!");
        }).catch((error) => {
            console.log("Failed to fetch logs:", error);
        });
    }, []);

    return (
        <Dialog open={open} onClose={closeDialog} className="relative z-50 text-black">
            <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true"></div>
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="max-w-lg space-y-6 border bg-white p-12 rounded-md">
                    <DialogTitle className="font-bold text-2xl">User Logs</DialogTitle>
                    <div className="space-y-6">
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
                </DialogPanel>
            </div>
        </Dialog>
    );
}
