import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

interface SignReqHistoryDialogProps {
    open: boolean;
    closeDialog: () => void;
}

interface SignReqs {
    signrequest_id: number,
    user_id: number,
    request_time: string,
    content_type: string,
    request_status: string
}

export function SignReqHistoryDialog({ open, closeDialog }: SignReqHistoryDialogProps) {
    const [signReq, setSignReq] = useState<SignReqs[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const logsPerPage = 5;

    const fetchLogs = async () => {
        const chainId = 137;
        const logsResponse = await fetch(`/api/wallet/transactions/${chainId}`);
        if (!logsResponse.ok) {
            throw new Error("Failed to fetch logs");
        }
        const logsData = await logsResponse.json();
        setSignReq(logsData);
    };

    useEffect(() => {
        fetchLogs()
            .then(() => {
                console.log("Fetched successfully!");
            })
            .catch((error) => {
                console.log("Failed to fetch logs:", error);
            });
    }, []);

    const totalPages = Math.ceil(signReq.length / logsPerPage);
    const paginatedSignReq = signReq.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage((prev) => prev - 1);
        }
    };

    return (
        <Dialog open={open} onClose={closeDialog} className="relative z-50 text-black">
            <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true"></div>
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="max-w-lg space-y-6 border bg-white p-12 rounded-md">
                    <DialogTitle className="font-bold text-2xl">Signature Request History</DialogTitle>
                    <div className="space-y-6">
                        <ul className="mt-4 space-y-4">
                            {paginatedSignReq.map((signReq) => (
                                <li key={signReq.signrequest_id} className="p-4 border-l-4 border-gray-400 rounded-lg">
                                    <span className="font-semibold">Request Time:</span>{" "}
                                    <span>
                                        {signReq.request_time.split("T")[0] + " " + signReq.request_time.split("T")[1].split(".")[0]}
                                    </span>
                                    <br />
                                    <span className="font-semibold">Content Type:</span> <span>{signReq.content_type}</span>
                                    <span className="font-semibold">Request Status:</span> <span>{signReq.request_status}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="flex justify-between items-center mt-4">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className={`px-4 py-2 bg-gray-300 rounded-md ${
                                    currentPage === 1 ? "cursor-not-allowed opacity-50" : ""
                                }`}
                            >
                                Previous
                            </button>
                            <span className="text-sm">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className={`px-4 py-2 bg-gray-300 rounded-md ${
                                    currentPage === totalPages ? "cursor-not-allowed opacity-50" : ""
                                }`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}
