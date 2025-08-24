'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Upload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');

  useEffect(() => {
    // Check if logged in
    const token = localStorage.getItem('competition_token');
    if (!token) {
      router.push('/join');
      return;
    }
    
    // Get participant info
    fetchParticipantInfo();
  }, [router]);

  const fetchParticipantInfo = async () => {
    try {
      const token = localStorage.getItem('competition_token');
      const response = await fetch('/api/participant/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setParticipantEmail(data.email);
      }
    } catch (error) {
      console.error('Failed to fetch participant info:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setUploadStatus('error');
        setStatusMessage('Please upload a PDF or PowerPoint file');
        return;
      }
      
      // Validate file size (50MB max)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setUploadStatus('error');
        setStatusMessage('File size must be less than 50MB');
        return;
      }
      
      setFile(selectedFile);
      setUploadStatus('idle');
      setStatusMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setUploadStatus('idle');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('competition_token');
      const response = await fetch('/api/submission/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      setUploadStatus('success');
      setStatusMessage('Your submission has been uploaded successfully!');
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      setUploadStatus('error');
      setStatusMessage('Failed to upload submission. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('competition_token');
    localStorage.removeItem('participant_id');
    router.push('/join');
  };

  // Calculate deadline (TBD for now)
  const deadline = 'To Be Determined';
  const daysRemaining = 'TBD';

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">GPai Case Competition</h1>
            <p className="text-sm text-gray-600">{participantEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Deadline Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-900">Submission Deadline</h2>
              <p className="text-blue-700 mt-1">{deadline}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">Time Remaining</p>
              <p className="text-2xl font-bold text-blue-900">{daysRemaining}</p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-6">Submit Your Case Study</h2>
          
          <div className="mb-6">
            <h3 className="font-medium mb-3">Submission Guidelines:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>File format: PDF or PowerPoint (PPT/PPTX)</li>
              <li>Maximum file size: 50MB</li>
              <li>You can re-submit to update your submission before the deadline</li>
              <li>Only your latest submission will be evaluated</li>
            </ul>
          </div>

          {/* File Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              id="file-input"
              type="file"
              accept=".pdf,.ppt,.pptx"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            
            {!file ? (
              <label htmlFor="file-input" className="cursor-pointer">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium mb-2">Click to upload your case study</p>
                <p className="text-sm text-gray-500">or drag and drop</p>
                <p className="text-xs text-gray-400 mt-2">PDF, PPT, PPTX up to 50MB</p>
              </label>
            ) : (
              <div>
                <svg className="mx-auto h-12 w-12 text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium mb-2">{file.name}</p>
                <p className="text-sm text-gray-500 mb-4">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload Submission'}
                  </button>
                  <button
                    onClick={() => {
                      setFile(null);
                      setUploadStatus('idle');
                      setStatusMessage('');
                      const fileInput = document.getElementById('file-input') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    disabled={uploading}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {uploadStatus === 'success' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {statusMessage}
              </p>
            </div>
          )}
          
          {uploadStatus === 'error' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {statusMessage}
              </p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Need help? Contact support at competition@gpai.app</p>
        </div>
      </div>
    </main>
  );
}