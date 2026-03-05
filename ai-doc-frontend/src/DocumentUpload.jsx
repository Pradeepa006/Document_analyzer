import { useState, useRef } from 'react';

function DocumentUpload() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);

    const validateFile = (file) => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        return validTypes.includes(file.type);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (validateFile(file)) {
                setSelectedFile(file);
                setError('');
                setSuccess(false);
            } else {
                setSelectedFile(null);
                setError('Invalid file type. Only PDF and image files are allowed.');
            }
        }
    };

    const handleUpload = () => {
        if (!selectedFile || uploading) return;

        setUploading(true);
        setProgress(0);
        setSuccess(false);

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setUploading(false);
                    setSuccess(true);
                    return 100;
                }
                return prev + 10;
            });
        }, 300);
    };

    const formatFileSize = (bytes) => {
        return (bytes / 1024).toFixed(2);
    };

    const handleDragClick = () => {
        if (!uploading) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-20">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-2">Upload Documents</h1>
                    <p className="text-sm text-gray-500">Upload PDF or image files for verification</p>
                </div>

                <div
                    onClick={handleDragClick}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors mb-2"
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading}
                    />
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400 mb-3"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                    >
                        <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <p className="text-gray-600">Click to select file</p>
                </div>

                <p className="text-xs text-gray-500 mb-4">Only PDF and image files are allowed</p>

                {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

                {selectedFile && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center">
                        <svg
                            className="h-8 w-8 text-blue-500 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)} KB</p>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${!selectedFile || uploading
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                >
                    Upload File
                </button>

                {uploading && (
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-600 text-center">Uploading... {progress}%</p>
                    </div>
                )}

                {success && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 text-center font-medium">
                            File uploaded successfully
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DocumentUpload;
