'use client';

import { useState } from 'react';
import SignaturePad from './SignaturePad';
import { FileText, CheckCircle } from 'lucide-react';

interface Contract {
  id: number;
  contract_number: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  supplier_name: string;
}

interface ContractSignerProps {
  contract: Contract;
  onSign: (signatureData: string, signatureType: 'draw' | 'type' | 'upload') => Promise<void>;
  onDecline?: () => void;
}

export default function ContractSigner({ contract, onSign, onDecline }: ContractSignerProps) {
  const [signatureType, setSignatureType] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const handleSignatureSave = async (signatureData: string) => {
    setIsSigning(true);
    try {
      await onSign(signatureData, signatureType);
      setSigned(true);
    } catch (error) {
      console.error('Error signing contract:', error);
    } finally {
      setIsSigning(false);
    }
  };

  const handleTypeSignature = async () => {
    if (typedSignature.trim().length < 2) {
      alert('Please enter your full name');
      return;
    }

    setIsSigning(true);
    try {
      await onSign(typedSignature, 'type');
      setSigned(true);
    } catch (error) {
      console.error('Error signing contract:', error);
    } finally {
      setIsSigning(false);
    }
  };

  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataURL = event.target?.result as string;
      setIsSigning(true);
      try {
        await onSign(dataURL, 'upload');
        setSigned(true);
      } catch (error) {
        console.error('Error signing contract:', error);
      } finally {
        setIsSigning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (signed) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-24 h-24 text-green-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Contract Signed!</h2>
        <p className="text-gray-600">Thank you for signing the contract.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Contract Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{contract.title}</h1>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>Contract #: {contract.contract_number}</span>
              <span>From: {contract.supplier_name}</span>
              <span>Date: {new Date(contract.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Contract Content */}
        <div className="border-t border-gray-200 pt-4">
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {contract.content}
            </div>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Sign Contract</h2>

        {/* Signature Type Selector */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setSignatureType('draw')}
            className={`px-4 py-2 font-medium transition-colors ${
              signatureType === 'draw'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Draw Signature
          </button>
          <button
            onClick={() => setSignatureType('type')}
            className={`px-4 py-2 font-medium transition-colors ${
              signatureType === 'type'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Type Signature
          </button>
          <button
            onClick={() => setSignatureType('upload')}
            className={`px-4 py-2 font-medium transition-colors ${
              signatureType === 'upload'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Upload Signature
          </button>
        </div>

        {/* Signature Input */}
        {signatureType === 'draw' && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">Draw your signature below:</p>
            <SignaturePad onSave={handleSignatureSave} />
          </div>
        )}

        {signatureType === 'type' && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">Type your full name:</p>
            <input
              type="text"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg font-signature text-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ fontFamily: 'Brush Script MT, cursive' }}
            />
            <button
              onClick={handleTypeSignature}
              disabled={isSigning || typedSignature.trim().length < 2}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSigning ? 'Signing...' : 'Sign Contract'}
            </button>
          </div>
        )}

        {signatureType === 'upload' && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">Upload an image of your signature:</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleUploadSignature}
              disabled={isSigning}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        )}

        {/* Legal Agreement */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              required
            />
            <span className="text-sm text-gray-700">
              By signing this contract, I agree that this electronic signature is legally binding and 
              represents my acceptance of the terms and conditions outlined in this contract.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          {onDecline && (
            <button
              onClick={onDecline}
              disabled={isSigning}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Decline
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
