import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet'

import Navigation from '../components/navigation.jsx'
import Footer from '../components/footer.jsx'
import './home.css'
import recentActivityData from '../data/recentActivity.json'

const Home = (props) => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (selectedFile.type === "application/pdf" || selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
    } else {
      alert("Please upload a PDF or image file.");
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setUploading(true);

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          completeUpload();
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const completeUpload = () => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = {
        name: file.name,
        type: file.type,
        content: e.target.result, // Base64 content
        timestamp: new Date().toISOString()
      };

      // Save to localStorage as a new chat session
      const chatId = Date.now().toString();
      const newChat = {
        id: chatId,
        title: file.name,
        messages: [],
        file: fileData,
        createdAt: new Date().toISOString()
      };

      const existingChats = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      localStorage.setItem('chatHistory', JSON.stringify([newChat, ...existingChats]));
      localStorage.setItem('currentChatId', chatId); // Auto-select new chat

      setUploading(false);
      navigate('/chat');
    };
    reader.readAsDataURL(file);
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="home-container1">
      <Helmet>
        <title>Sweet Foolish Anteater</title>
        <meta property="og:title" content="Sweet Foolish Anteater" />
        <link
          rel="canonical"
          href="https://sweet-foolish-anteater-k244bc.teleporthq.app/"
        />
      </Helmet>
      <Navigation></Navigation>
      <section className="hero-upload-container">
        <div className="hero-upload-inner">
          <div className="hero-upload-card">
            <div className="hero-upload-header">
              <h1 className="home-hero-title hero-title">Upload Document</h1>
              <p className="hero-subtitle">
                Upload PDF or image files for verification
              </p>
            </div>

            <div
              className={`hero-upload-dropzone ${dragActive ? "dragover" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              style={{ borderColor: file ? 'var(--color-primary)' : '' }}
            >
              <div className="dropzone-content">
                <div className="dropzone-icon-wrapper">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 13v8m-8-6.101A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                    <path d="m8 17l4-4l4 4"></path>
                  </svg>
                </div>
                <p className="dropzone-text">{file ? file.name : "Drag-and-drop area"}</p>
                <button type="button" className="btn-link" onClick={onButtonClick}>
                  {file ? "Change file" : "Click to browse files"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-input"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div className="hero-upload-helper">
              <p className="section-content">
                Only PDF and image files are allowed
              </p>
            </div>

            <div className="hero-upload-controls">
              <button
                className="btn btn-primary btn-lg"
                disabled={!file || uploading}
                onClick={handleUpload}
              >
                {uploading ? "Uploading..." : "Upload File"}
              </button>

              {uploading && (
                <div className="home-thq-progress-wrapper-elm progress-wrapper" style={{ display: 'flex' }}>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                  <span className="progress-status">
                    {progress}%
                  </span>
                </div>
              )}
            </div>

            <div className="hero-upload-footer">
              <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
                <a href="#workflow" style={{ textDecoration: 'none' }}>
                  <div className="btn btn-outline">
                    <span>Generate Summary</span>
                  </div>
                </a>
                <Link to="/chat" style={{ textDecoration: 'none' }}>
                  <div className="btn btn-outline">
                    <span>Ask</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rest of the sections remain unchanged, just rendering them static */}
      <section className="dashboard-actions-section">
        <div className="dashboard-actions-inner">
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12m5-7l-5-5l-5 5m14 7v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                </svg>
              </div>
              <h3 className="section-subtitle">Start Upload</h3>
              <p className="section-content">
                Initiate a new document verification request instantly.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={onButtonClick}>Upload Now</button>
            </div>

            <div className="dashboard-card">
              <div className="card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9a9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5m4-1v5l4 2"></path>
                  </g>
                </svg>
              </div>
              <h3 className="section-subtitle">Open Document History</h3>
              <p className="section-content">
                Access previously verified files and audit logs.
              </p>
              <Link to="/chat" className="btn btn-outline btn-sm" style={{ textDecoration: 'none', display: 'inline-block' }}>View Archive</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="features-grid-section">
        <div className="features-grid-inner">
          <h2 className="section-title">Secure Documentation Features</h2>
          <div className="features-container">
            <div className="feature-tile">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path>
                <path d="M14 2v5a1 1 0 0 0 1 1h5"></path>
              </svg>
              <span className="section-subtitle">Accepted File Types</span>
              <p className="section-content">
                Full support for PDF, JPG, and PNG formats with automatic type
                detection.
              </p>
            </div>
            <div className="feature-tile">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m16 6l-4-4l-4 4m4-4v8"></path>
                <rect width="20" height="8" x="2" y="14" rx="2"></rect>
                <path d="M6 18h.01M10 18h.01"></path>
              </svg>
              <span className="section-subtitle">Drag-and-Drop Upload</span>
              <p className="section-content">
                Intuitive interface for rapid bulk uploads or single file
                processing.
              </p>
            </div>
            <div className="feature-tile">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v16a2 2 0 0 0 2 2h16M7 16h8m-8-5h12M7 6h3"></path>
              </svg>
              <span className="section-subtitle">Progress Tracking</span>
              <p className="section-content">
                Real-time visual feedback on upload status and verification
                stages.
              </p>
            </div>
            <div className="feature-tile">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
              <span className="section-subtitle">Verification Controls</span>
              <p className="section-content">
                Granular permissions for multi-stage document auditing and
                approval.
              </p>
            </div>
            <div className="feature-tile">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.65 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v10.1"></path>
                <path d="M14 2v5a1 1 0 0 0 1 1h5m-10 7l1 1m0-2l-4.586 4.586"></path>
                <circle cx="5" cy="20" r="2"></circle>
              </svg>
              <span className="section-subtitle">
                Security &amp; Compliance
              </span>
              <p className="section-content">
                Bank-grade encryption and GDPR compliance for all sensitive
                documents.
              </p>
            </div>
            <div className="feature-tile">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
              <span className="section-subtitle">Team Collaboration</span>
              <p className="section-content">
                Shared workspaces with activity logs for seamless project
                coordination.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="recent-uploads-showcase">
        <div className="recent-uploads-header">
          <h2 className="section-title">Recent Activity</h2>
          <Link to="/chat">
            <div className="btn-link">
              <span>View Document History</span>
            </div>
          </Link>
        </div>
        <div className="recent-rail-wrapper">
          <div className="recent-rail">
            {recentActivityData.map((activity) => (
              <div className="recent-card" key={activity.id}>
                <div className="recent-thumb">
                  <img
                    src={activity.thumbnail}
                    alt="Document Preview"
                  />
                  <span className={`recent-badge ${activity.status.toLowerCase()}`}>{activity.status}</span>
                </div>
                <div className="recent-info">
                  <span className="section-subtitle">{activity.filename}</span>
                  <p className="section-content">{activity.timestamp} • {activity.project}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="get-started-cta">
        <div className="get-started-inner">
          <div className="cta-card">
            <h2 className="section-title">Ready to streamine your workflow?</h2>
            <p className="section-content">
              Encouraging users to upload documents now or invite team members
              to a project. Join thousands of teams using DocuLift for secure
              verification.
            </p>
            <div className="cta-buttons">
              <button className="btn btn-primary btn-lg" onClick={onButtonClick}>Upload Now</button>
              <button className="btn btn-lg btn-outline">
                Invite Team Members
              </button>
            </div>
          </div>
        </div>
      </section>
      <Footer></Footer>
    </div>
  )
}

export default Home
