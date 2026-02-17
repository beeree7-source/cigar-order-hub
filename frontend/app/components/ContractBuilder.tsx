'use client';

import { useState, useEffect } from 'react';
import { Save, Send, FileText } from 'lucide-react';

interface ContractBuilderProps {
  onSave: (contractData: ContractData) => Promise<void>;
  onSend?: (contractId: number) => Promise<void>;
  initialData?: Partial<ContractData>;
}

interface ContractData {
  retailerId: number;
  title: string;
  content: string;
  contractType: string;
  expiresAt?: string;
}

interface Retailer {
  id: number;
  name: string;
  email: string;
}

const contractTemplates = {
  sales: `SALES AGREEMENT

This Sales Agreement ("Agreement") is entered into on [DATE] between:

SELLER: [SUPPLIER_NAME]
BUYER: [RETAILER_NAME]

1. PRODUCTS AND SERVICES
The Seller agrees to sell and the Buyer agrees to purchase the following products:
[PRODUCT_DETAILS]

2. PRICING AND PAYMENT TERMS
[PRICING_TERMS]

3. DELIVERY TERMS
[DELIVERY_TERMS]

4. WARRANTIES
[WARRANTY_TERMS]

5. TERM AND TERMINATION
[TERMINATION_TERMS]

By signing below, both parties agree to the terms and conditions outlined in this agreement.`,
  
  service: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into on [DATE] between:

SERVICE PROVIDER: [SUPPLIER_NAME]
CLIENT: [RETAILER_NAME]

1. SERVICES
The Service Provider agrees to provide the following services:
[SERVICE_DESCRIPTION]

2. COMPENSATION
[PAYMENT_TERMS]

3. TERM
[DURATION_TERMS]

4. CONFIDENTIALITY
[CONFIDENTIALITY_TERMS]

5. TERMINATION
[TERMINATION_TERMS]

By signing below, both parties agree to the terms and conditions outlined in this agreement.`,
  
  nda: `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into on [DATE] between:

DISCLOSING PARTY: [SUPPLIER_NAME]
RECEIVING PARTY: [RETAILER_NAME]

1. CONFIDENTIAL INFORMATION
[DEFINITION_OF_CONFIDENTIAL_INFO]

2. OBLIGATIONS
[OBLIGATIONS_TERMS]

3. TERM
[DURATION_TERMS]

4. RETURN OF MATERIALS
[RETURN_TERMS]

By signing below, both parties agree to the terms and conditions outlined in this agreement.`,
  
  partnership: `PARTNERSHIP AGREEMENT

This Partnership Agreement ("Agreement") is entered into on [DATE] between:

PARTY A: [SUPPLIER_NAME]
PARTY B: [RETAILER_NAME]

1. PURPOSE
[PURPOSE_OF_PARTNERSHIP]

2. CONTRIBUTIONS
[CONTRIBUTION_TERMS]

3. PROFIT AND LOSS SHARING
[PROFIT_SHARING_TERMS]

4. DECISION MAKING
[DECISION_MAKING_TERMS]

5. TERM AND TERMINATION
[TERMINATION_TERMS]

By signing below, both parties agree to the terms and conditions outlined in this agreement.`
};

export default function ContractBuilder({ onSave, onSend, initialData }: ContractBuilderProps) {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [formData, setFormData] = useState<ContractData>({
    retailerId: initialData?.retailerId || 0,
    title: initialData?.title || '',
    content: initialData?.content || '',
    contractType: initialData?.contractType || 'sales',
    expiresAt: initialData?.expiresAt || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [savedContractId, setSavedContractId] = useState<number | null>(null);

  useEffect(() => {
    fetchRetailers();
  }, []);

  useEffect(() => {
    if (!initialData?.content) {
      loadTemplate(formData.contractType);
    }
  }, [formData.contractType]);

  const fetchRetailers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/protected/users?role=retailer`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRetailers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching retailers:', error);
    }
  };

  const loadTemplate = (type: string) => {
    const template = contractTemplates[type as keyof typeof contractTemplates] || '';
    setFormData(prev => ({ ...prev, content: template }));
  };

  const handleSave = async () => {
    if (!formData.retailerId || !formData.title || !formData.content) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      // In a real implementation, you'd get the contract ID from the response
    } catch (error) {
      console.error('Error saving contract:', error);
      alert('Failed to save contract');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!savedContractId) {
      alert('Please save the contract first');
      return;
    }

    if (!onSend) return;

    setIsSending(true);
    try {
      await onSend(savedContractId);
      alert('Contract sent successfully!');
    } catch (error) {
      console.error('Error sending contract:', error);
      alert('Failed to send contract');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Contract Builder</h1>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Retailer *
            </label>
            <select
              value={formData.retailerId}
              onChange={(e) => setFormData({ ...formData, retailerId: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value={0}>Select a retailer</option>
              {retailers.map((retailer) => (
                <option key={retailer.id} value={retailer.id}>
                  {retailer.name} ({retailer.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Type *
            </label>
            <select
              value={formData.contractType}
              onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="sales">Sales Agreement</option>
              <option value="service">Service Agreement</option>
              <option value="nda">Non-Disclosure Agreement</option>
              <option value="partnership">Partnership Agreement</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Annual Supply Agreement 2024"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contract Content *
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={20}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="Enter contract content..."
          required
        />
        <p className="text-xs text-gray-500 mt-2">
          Use placeholders like [DATE], [SUPPLIER_NAME], [RETAILER_NAME] which will be replaced when generating the PDF
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save as Draft'}
        </button>
        {savedContractId && onSend && (
          <button
            onClick={handleSend}
            disabled={isSending}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            {isSending ? 'Sending...' : 'Send to Retailer'}
          </button>
        )}
      </div>
    </div>
  );
}
