'use client';

import { useState } from 'react';
import { Download, Printer, FileText, CheckCircle } from 'lucide-react';

interface Contract {
  id: number;
  contract_number: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  signed_at?: string;
  supplier_name: string;
  retailer_name: string;
}

interface Signature {
  id: number;
  signerName: string;
  signerRole: string;
  signatureType: string;
  signedAt: string;
}

interface ContractViewerProps {
  contract: Contract;
  signatures?: Signature[];
}

export default function ContractViewer({ contract, signatures = [] }: ContractViewerProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/protected/contracts/${contract.id}/pdf`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${contract.contract_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading contract:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'text-gray-600',
      sent: 'text-blue-600',
      viewed: 'text-yellow-600',
      signed: 'text-green-600',
      completed: 'text-purple-600',
      cancelled: 'text-red-600'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 no-print">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{contract.title}</h1>
            <p className="text-gray-600">Contract #: {contract.contract_number}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Status</p>
            <p className={`font-medium capitalize ${getStatusColor(contract.status)}`}>
              {contract.status}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Supplier</p>
            <p className="font-medium text-gray-900">{contract.supplier_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Retailer</p>
            <p className="font-medium text-gray-900">{contract.retailer_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p className="font-medium text-gray-900">
              {new Date(contract.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Contract Content */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="prose max-w-none">
          <div className="text-center mb-8 border-b pb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{contract.title}</h2>
            <p className="text-gray-600">Contract Number: {contract.contract_number}</p>
            <p className="text-gray-600 text-sm mt-2">
              Created: {formatDate(contract.created_at)}
            </p>
          </div>
          
          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
            {contract.content}
          </div>

          {/* Signatures Section */}
          {signatures.length > 0 && (
            <div className="mt-12 pt-8 border-t">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Signatures</h3>
              <div className="space-y-6">
                {signatures.map((signature) => (
                  <div key={signature.id} className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{signature.signerName}</p>
                      <p className="text-sm text-gray-600 capitalize">
                        {signature.signerRole} • {signature.signatureType} signature
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Signed on: {formatDate(signature.signedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contract.signed_at && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">
                  This contract was signed on {formatDate(contract.signed_at)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mb-8 no-print">
        <p>This is a legally binding electronic contract</p>
        <p className="mt-1">Generated from Cigar Order Hub platform</p>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}
