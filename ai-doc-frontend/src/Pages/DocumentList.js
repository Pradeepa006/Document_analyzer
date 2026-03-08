import React, { useEffect, useState } from "react";
import "./DocumentList.css";
import { FaEye, FaTrash, FaUpload } from "react-icons/fa";

function DocumentList() {

  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/documents")
      .then(res => res.json())
      .then(data => setDocs(data));
  }, []);

  const handleDelete = (id) => {
    if (window.confirm("Delete this document?")) {
      fetch(`http://127.0.0.1:8000/delete/${id}`, {
        method: "DELETE"
      }).then(() => {
        setDocs(docs.filter(doc => doc.id !== id));
      });
    }
  };

  const filteredDocs = docs.filter(doc =>
    doc.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">DocuLift</div>

        <ul>
          <li>Dashboard</li>
          <li className="active">Documents</li>
          <li>Settings</li>
        </ul>

        <img
          className="avatar"
          src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
          alt="user"
        />
      </nav>

      <div className="page">

        <header>
          <h2>Document Library</h2>

          <button className="upload">
            <FaUpload /> Upload Document
          </button>
        </header>

        <div className="controls">
          <input
            placeholder="Search documents..."
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid">
          {filteredDocs.map(doc => (
            <div className="card" key={doc.id}>

              <img
                src="https://cdn-icons-png.flaticon.com/512/337/337946.png"
                alt="doc"
              />

              <h4>{doc.name}</h4>

              <span className={doc.status}>{doc.status}</span>

              <p className="summary">
                Extracted Summary: Important content detected inside this document.
              </p>

              <div className="actions">
                <a href={`/view/${doc.name}`}>
                  <button><FaEye /> Open</button>
                </a>
                <button className="danger" onClick={() => handleDelete(doc.id)}>
                  <FaTrash /> Remove
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

      <section className="about">
        <h2>How DocuLift Works</h2>
        <p>Upload → AI extracts → Read summary</p>
      </section>

      <footer>
        © 2026 DocuLift — AI Document Intelligence Platform
      </footer>
    </>
  );
}

export default DocumentList;
