import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useEffect, useState } from "react";

interface TransactionDetails {
  value: string;
  to: string;
  nonce: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  type: number;
  chainId: number;
  gas: number;
  [key: string]: string | number;
}

interface SignDialogProps {
  open: boolean;
  closeDialog: () => void;
  walletAddress: string;
}

interface GasFeeResult {
  success: string;
  chainId: number;
  data: {
    feePerGas: number;
    priorityFeePerGas: number;
  };
}

const fetchGasFee = async (chainId: number): Promise<GasFeeResult> => {
  const response = await fetch(`/api/blockchain/gas/${chainId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch gas fee");
  }
  return response.json();
};

const fetchNewNonce = async (chainId: number, walletAddress: string): Promise<number> => {
  const response = await fetch(`/wallet/new-transaction/nonce/${chainId}/${walletAddress}`);
  if (!response.ok) {
    throw new Error("Failed to fetch new nonce");
  }
  return response.json();
};

const requestSignature = async (mode: "message" | "transaction", requestData: object): Promise<string> => {
  const response = await fetch(`/api/wallet/sign/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestData),
  });

  const res = await response.json();
  if (!response.ok || !res.success || !res.signature) {
    throw new Error("Request signature failed");
  }

  return res.signature;
};

export function SignDialog({ open, closeDialog, walletAddress }: SignDialogProps) {
  const [activeTab, setActiveTab] = useState<"message" | "transaction">("message");
  const [message, setMessage] = useState<string>("");
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails>({
    value: "",
    to: "",
    nonce: "",
    maxFeePerGas: "",
    maxPriorityFeePerGas: "",
    type: 2,
    chainId: 137,
    gas: 21000,
  });  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<string>("");

  const isPolygonAddress = (address: string): boolean => /^(0x)?[0-9a-fA-F]{40}$/.test(address);

  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isPolygonAddress(transactionDetails.to)) {
      newErrors.to = "Invalid Polygon wallet address.";
    }

    ["value", "nonce", "maxFeePerGas", "maxPriorityFeePerGas"].forEach((field) => {
      const value = Number(transactionDetails[field as keyof typeof transactionDetails]);
      if (isNaN(value) || value <= 0) {
        newErrors[field] = `${field} must be a positive number.`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransactionDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    try {
      if (activeTab === "transaction") {
        if (!validateFields()) return;
        const transactionSignature = await requestSignature("transaction", transactionDetails);
        setSignature(transactionSignature);
      } else {
        const messageSignature = await requestSignature("message", { message });
        setSignature(messageSignature);
      }
    } catch (error) {
      console.error("Signing Error:", error);
    }
  };

  useEffect(() => {
    if (open && activeTab === "transaction") {
      const fetchGasAndNonce = async () => {
        try {
          // Fetch Gas Fee
          const gasFeeData = await fetchGasFee(transactionDetails.chainId);
  
          // Fetch Nonce
          const nonce = await fetchNewNonce(transactionDetails.chainId, walletAddress);
  
          // Update state with fetched values
          setTransactionDetails((prev) => ({
            ...prev,
            maxFeePerGas: gasFeeData.data.feePerGas.toString(),
            maxPriorityFeePerGas: gasFeeData.data.priorityFeePerGas.toString(),
            nonce: nonce.toString(),
          }));
        } catch (error) {
          console.error("Error fetching gas fee or nonce:", error);
        }
      };
  
      fetchGasAndNonce();
    }
  }, [open, activeTab, transactionDetails.chainId]);
  

  return (
    <Dialog open={open} onClose={closeDialog} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-md" aria-hidden="true"></div>
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8 border border-gray-200">
          <DialogTitle className="font-semibold text-2xl text-gray-900 text-center">Sign Message / Transaction</DialogTitle>

          {/* Tab Buttons */}
          <div className="flex justify-center space-x-4 mt-6">
            {["message", "transaction"].map((tab) => (
              <button
                key={tab}
                className={`px-5 py-2 rounded-lg text-sm font-medium ${
                  activeTab === tab ? "bg-gray-900 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                onClick={() => setActiveTab(tab as "message" | "transaction")}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content Section */}
          <div className="mt-6">
            {activeTab === "message" ? (
              <textarea
                placeholder="Enter message to sign"
                className="w-full border border-gray-300 rounded-lg p-3 bg-white text-black"
                onChange={(e) => setMessage(e.target.value)}
              />
            ) : (
              <div className="space-y-4">
                {["to", "value", "nonce", "maxFeePerGas", "maxPriorityFeePerGas"].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-black">{field}</label>
                    <input
                      type={field === "value" ? "number" : "text"}
                      name={field}
                      value={transactionDetails[field]}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg p-3 bg-white text-black"
                    />
                    {errors[field] && <p className="text-red-500 text-sm">{errors[field]}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="mt-6 space-y-3">
            <button className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800" onClick={handleSubmit}>
              Confirm
            </button>
            <button className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300" onClick={closeDialog}>
              Cancel
            </button>
          </div>

          {/* Signature Display */}
          {signature && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-800">
                <strong>Signature:</strong>
                <br />
                {signature}
              </p>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
