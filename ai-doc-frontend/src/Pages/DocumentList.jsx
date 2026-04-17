import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DocumentList.css";
import { FaEye, FaTrash, FaUpload, FaUndo } from "react-icons/fa";

function DocumentList() {

  const navigate = useNavigate();

  const [docs, setDocs] = useState([]);
  const [trash, setTrash] = useState([]);
  const [search, setSearch] = useState("");

// Load documents + trash from backend//hello
const loadData = () => {

  fetch("http://localhost:8000/api/v1/documents")
    .then(res => res.json())
    .then(data => {

      const formatted = data.map(d => ({
        id: d.id,
        name: d.name,
        file: d.file,
        status: d.status
      }));

      console.log("Formatted documents:", formatted);

      setDocs(formatted);

    })
    .catch(err => console.error("Error loading documents:", err));


  fetch("http://localhost:8000/api/v1/trash")
    .then(res => res.json())
    .then(data => {

      const formatted = data.map(d => ({
        id: d.id,
        name: d.name,
        file: d.file,
        status: "trash"
      }));

      console.log("Formatted trash:", formatted);

      setTrash(formatted);

    })
    .catch(err => console.error("Error loading trash:", err));
};

  // Load once when page opens
  useEffect(() => {
    loadData();
  }, []);


  // Open document in new tab
const openDocument = (doc) => {

  const fileUrl = `http://localhost:8000${doc.file}`;

  const ext = doc.name.split(".").pop().toLowerCase();

  if (ext === "doc" || ext === "docx") {

    window.open(
      `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`,
      "_blank"
    );

  } else {

    window.open(fileUrl, "_blank");

  }
};

  // Delete document
const handleDelete = (id) => {

  fetch(`http://localhost:8000/api/v1/documents/${id}`, {
    method: "DELETE"
  })
  .then(res => res.json())
  .then(data => {
    console.log("Deleted:", data);
    loadData(); // refresh UI
  })
  .catch(err => console.error("Delete error:", err));

};


  // Restore document
const handleRestore = (id) => {

  fetch(`http://localhost:8000/api/v1/restore/${id}`, {
    method: "PUT"
  })
  .then(res => res.json())
  .then(data => {
    console.log("Restore success:", data);
    loadData();   // refresh UI
  })
  .catch(err => console.error("Restore error:", err));

};

  // Search filter
  const filteredDocs = docs.filter(doc =>
    doc?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const clearTrash = () => {

  fetch("http://localhost:8000/api/v1/trash/clear", {
    method: "DELETE"
  })
  .then(() => loadData())
  .catch(err => console.error("Clear trash error:", err));

};

  return (
    <>
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

          <button
            className="upload"
            onClick={() => navigate("/app")}
          >
            <FaUpload /> Upload Document
          </button>

        </header>

        <div className="controls">

          <input
            placeholder="Search documents..."
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />

        </div>

        {/* Active Documents */}

        <h3>Active Documents</h3>
        <p>Total docs: {docs.length}</p>

        <div className="grid">

          {filteredDocs.map(doc => (

            <div className="card" key={doc.id}>

              <h4>{doc.name}</h4>

              <span className={doc.status}>{doc.status}</span>

              <div className="actions">

                <button onClick={() => openDocument(doc)}>
                  <FaEye /> Open
                </button>

                <button
                  className="danger"
                  onClick={() => handleDelete(doc.id)}
                >
                  <FaTrash /> Delete
                </button>

              </div>

            </div>

          ))}

        </div>

        {/* Trash */}

        {trash.length > 0 && (

          <>

            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>

              <h3 style={{marginTop:"50px"}}>Trash</h3>

              <button
                style={{
                  background:"#ff4d4f",
                  color:"white",
                  border:"none",
                  padding:"8px 15px",
                  borderRadius:"5px",
                  cursor:"pointer"
                }}
                onClick={clearTrash}
              >
                Clear Trash
              </button>

            </div>


            <div className="grid">

              {trash.map(doc => (

                <div className="card" key={doc.id}>

                  <h4>{doc.name}</h4>

                  <div className="actions">

                    <button onClick={() => handleRestore(doc.id)}>
                      <FaUndo /> Restore
                    </button>

                  </div>

                </div>

              ))}

            </div>

          </>

        )}

      </div>

      <section className="about">

        <h2>How DocuLift Works</h2>

        <p>Upload → AI extracts → Read summary</p>

      </section>

      <footer>

        © 2026 DocuLift

      </footer>

    </>
  );
}

export default DocumentList;
