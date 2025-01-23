import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState } from 'react';

interface SignDialogProps {
  open: boolean;
  closeDialog: () => void;
}

interface GasFeeResult {
  success: string;
  chainId: number;
  data: {
    feePerGas: number;
    priorityFeePerGas: number;
  }
}

const fetchGasFee = async (chainId: number) => {
  const logsResponse = await fetch(`/api/blockchain/gas/${chainId}`);
  if (!logsResponse.ok) {
    throw new Error("Failed to fetch gas fee");
  }
  const data = await logsResponse.json();
  return data as GasFeeResult;
};

const requestSignature = async (mode: string, requestData: Object) => {
  const response = await fetch(`/api/wallet/sign/${mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    throw new Error('Failed to get registration options from server');
  }

  const res = await response.json();
  if (!res.success && !res.signature) {
    throw new Error('Request signature failed');
  }
  
  return res.signature;
}

export function SignDialog({ open, closeDialog }: SignDialogProps) {
  const [activeTab, setActiveTab] = useState<'message' | 'transaction'>('message');
  const [message, setMessage] = useState<string>("");
  const [transactionDetails, setTransactionDetails] = useState({
    value: '',
    to: '',
    nonce: '',
    maxFeePerGas: '',
    maxPriorityFeePerGas: '',
    type: 2,
    chainId: 137,
    gas: 21000,
  });
  const [errors, setErrors] = useState({
    to: '',
    value: '',
    nonce: '',
    maxFeePerGas: '',
    maxPriorityFeePerGas: '',
  });
  const [signature, setSignature] = useState<string>("");

  const isPolygonAddress = (address: string) => {
    const polygonRegex = /^(0x)?[0-9a-fA-F]{40}$/;
    return polygonRegex.test(address);
  };

  const validateFields = () => {
    const newErrors: {
      to: string;
      value: string;
      nonce: string;
      maxFeePerGas: string;
      maxPriorityFeePerGas: string;
    } = {
      to: '',
      value: '',
      nonce: '',
      maxFeePerGas: '',
      maxPriorityFeePerGas: '',
    };

    if (!isPolygonAddress(transactionDetails.to)) {
      newErrors.to = 'Invalid Polygon wallet address.';
    }

    ['value', 'nonce', 'maxFeePerGas', 'maxPriorityFeePerGas'].forEach((field) => {
      const value = Number(transactionDetails[field as keyof typeof transactionDetails]);
      if (isNaN(value) || value <= 0) {
        newErrors[field as keyof typeof newErrors] = `${field} must be a positive number.`;
      }
    });

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => !error);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTransactionDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleTabChange = (tab: 'message' | 'transaction') => {
    setActiveTab(tab);
  };

  const handleSubmit = async () => {
    if (activeTab === 'transaction' && !validateFields()) {
      return;
    }

    if (activeTab === 'message') {
      console.log('Sign Message Start');
      const messageSignature = await requestSignature(activeTab, { message: message });
      setSignature(messageSignature);
      
    } else {
      console.log('Sign Transaction Start:', transactionDetails);
      const transactionSignature = await requestSignature(activeTab, transactionDetails);
      setSignature(transactionSignature);
    }
  };

  useEffect(() => {
    if (activeTab === 'transaction') {
      fetchGasFee(transactionDetails.chainId)
        .then((data) => {
          setTransactionDetails((prev) => ({
            ...prev,
            maxFeePerGas: data.data.feePerGas.toString(),
            maxPriorityFeePerGas: data.data.priorityFeePerGas.toString(),
          }));
        })
        .catch((error) => {
          console.error('Failed to fetch gas fee:', error);
        });
    }
  }, [activeTab, transactionDetails.chainId]);

  return (
    <Dialog open={open} onClose={closeDialog} className="relative z-50 text-black">
      <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true"></div>

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-lg space-y-6 border bg-white p-12 rounded-md shadow-md">
          <DialogTitle className="font-bold text-2xl">Sign Message / Transaction</DialogTitle>
          <div className="flex space-x-4">
            <button
              className={`px-4 py-2 rounded ${activeTab === 'message' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
                }`}
              onClick={() => handleTabChange('message')}
            >
              Message
            </button>
            <button
              className={`px-4 py-2 rounded ${activeTab === 'transaction' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
                }`}
              onClick={() => handleTabChange('transaction')}
            >
              Transaction
            </button>
          </div>

          {activeTab === 'message' ? (
            <div className="space-y-4">
              <textarea
                placeholder="Enter message to sign"
                className="w-full border rounded p-2 bg-white"
                onChange={(event) => {
                  setMessage(event.target.value);
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {['to', 'value', 'nonce', 'maxFeePerGas', 'maxPriorityFeePerGas'].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700">{field}</label>
                  <input
                    type={field === 'value' ? 'number' : 'text'}
                    name={field}
                    value={transactionDetails[field as keyof typeof transactionDetails]}
                    onChange={handleInputChange}
                    className="w-full border rounded p-2 bg-white"
                  />
                  {errors[field as keyof typeof errors] && (
                    <p className="text-red-500 text-sm">{errors[field as keyof typeof errors]}</p>
                  )}
                </div>
              ))}

              <div>
                <p className="text-sm text-gray-700">
                  <strong>Type:</strong> {transactionDetails.type}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Chain ID:</strong> {transactionDetails.chainId}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Gas:</strong> {transactionDetails.gas}
                </p>
              </div>
            </div>
          )}

          <button
            className="px-6 py-2 w-full bg-black text-white rounded hover:bg-gray-800"
            onClick={handleSubmit}
          >
            Confirm
          </button>
          <button
            className="px-6 py-2 w-full bg-gray-200 text-gray-700 rounded hover:bg-gray-300 mt-4"
            onClick={
              () => {
                setSignature("");
                closeDialog();
              }
            }
          >
            Cancel
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
