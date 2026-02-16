'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, FolderOpen } from 'lucide-react';
import DocumentScanner from '../components/DocumentScanner';
import DocumentUpload from '../components/DocumentUpload';
import DocumentFolder from '../components/DocumentFolder';

export default function DocumentsPage() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedRetailerId, setSelectedRetailerId] = useState<number>(0);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Get user from localStorage or context
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      if (parsedUser.role === 'supplier') {
        fetchRetailers();
      }
    }
  }, []);

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
        if (data.users && data.users.length > 0) {
          setSelectedRetailerId(data.users[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching retailers:', error);
    }
  };

  const handleScanCapture = async (imageSrc: string) => {
    // Convert base64 to file
    const response = await fetch(imageSrc);
    const blob = await response.blob();
    const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    await handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    if (!selectedRetailerId) {
      alert('Please select a retailer first');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('supplierId', user.id.toString());
      formData.append('retailerId', selectedRetailerId.toString());
      formData.append('documentType', 'other');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/protected/documents/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (response.ok) {
        alert('Document uploaded successfully!');
        setShowUpload(false);
        // Trigger document list refresh
        setRefreshTrigger(prev => prev + 1);
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Upload failed. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user.role !== 'supplier') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">
            Document management is only available for suppliers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Management</h1>
        <p className="text-gray-600">Upload and manage documents for your retailers</p>
      </div>

      {/* Retailer Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Retailer
        </label>
        <select
          value={selectedRetailerId}
          onChange={(e) => setSelectedRetailerId(parseInt(e.target.value))}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={0}>Select a retailer...</option>
          {retailers.map((retailer) => (
            <option key={retailer.id} value={retailer.id}>
              {retailer.name} ({retailer.email})
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      {selectedRetailerId > 0 && (
        <>
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Camera className="w-5 h-5" />
              Scan Document
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Upload className="w-5 h-5" />
              Upload File
            </button>
          </div>

          {/* Upload Section */}
          {showUpload && (
            <div className="mb-6">
              <DocumentUpload onUpload={handleUpload} />
            </div>
          )}

          {/* Document List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <FolderOpen className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Documents</h2>
            </div>
            <DocumentFolder
              supplierId={user.id}
              retailerId={selectedRetailerId}
              canDelete={true}
              refreshTrigger={refreshTrigger}
              onDelete={(id) => console.log('Deleted document:', id)}
            />
          </div>
        </>
      )}

      {/* Document Scanner Modal */}
      {showScanner && (
        <DocumentScanner
          onCapture={handleScanCapture}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
