// frontend/src/pages/admin/ManageInvitations.js
import React, { useState, useEffect } from 'react';
import { Container, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { ContentCopy, QrCode, Add, Delete } from '@mui/icons-material';
import axios from 'axios';

const ManageInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openQRDialog, setOpenQRDialog] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  // טעינת רשימת ההזמנות
  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/invitations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.success) {
        setInvitations(response.data.data);
      }
    } catch (error) {
      setError('שגיאה בטעינת רשימת ההזמנות');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  // יצירת הזמנה חדשה
  const createInvitation = async () => {
    try {
      const response = await axios.post('/api/invitations', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.success) {
        fetchInvitations();
        setOpenCreateDialog(false);
      }
    } catch (error) {
      setError('שגיאה ביצירת הזמנה חדשה');
      console.error(error);
    }
  };

  // קבלת קוד QR
  const getQRCode = async (code) => {
    try {
      const response = await axios.get(`/api/invitations/${code}/qr`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.success) {
        setSelectedQR({
          qrCode: response.data.data.qrCode,
          inviteUrl: response.data.data.inviteUrl
        });
        setOpenQRDialog(true);
      }
    } catch (error) {
      setError('שגיאה בקבלת קוד QR');
      console.error(error);
    }
  };

  // העתקת קישור להזמנה
  const copyInviteLink = (code) => {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/onboarding/${code}`;
    
    navigator.clipboard.writeText(inviteUrl)
      .then(() => {
        alert('הקישור הועתק בהצלחה!');
      })
      .catch((err) => {
        console.error('שגיאה בהעתקת הקישור:', err);
      });
  };

  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Typography variant="h4">ניהול הזמנות</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Add />}
          onClick={() => setOpenCreateDialog(true)}
        >
          יצירת הזמנה חדשה
        </Button>
      </div>
      
      {error && <Typography color="error">{error}</Typography>}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>קוד הזמנה</TableCell>
              <TableCell>נוצר בתאריך</TableCell>
              <TableCell>תוקף עד</TableCell>
              <TableCell>מספר משתמשים</TableCell>
              <TableCell>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation._id}>
                <TableCell>{invitation.code}</TableCell>
                <TableCell>{new Date(invitation.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(invitation.expiresAt).toLocaleDateString()}</TableCell>
                <TableCell>{invitation.usedBy?.length || 0}</TableCell>
                <TableCell>
                  <IconButton onClick={() => copyInviteLink(invitation.code)} title="העתק קישור">
                    <ContentCopy />
                  </IconButton>
                  <IconButton onClick={() => getQRCode(invitation.code)} title="הצג קוד QR">
                    <QrCode />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* דיאלוג להצגת קוד QR */}
      <Dialog open={openQRDialog} onClose={() => setOpenQRDialog(false)}>
        <DialogTitle>קוד QR להזמנה</DialogTitle>
        <DialogContent>
          {selectedQR && (
            <>
              <div style={{ textAlign: 'center', margin: '1rem' }}>
                <img src={selectedQR.qrCode} alt="QR Code" style={{ maxWidth: '100%' }} />
              </div>
              <TextField
                fullWidth
                value={selectedQR.inviteUrl}
                label="קישור להזמנה"
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
              />
              <Button 
                fullWidth 
                variant="outlined" 
                style={{ marginTop: '1rem' }}
                onClick={() => navigator.clipboard.writeText(selectedQR.inviteUrl)}
              >
                העתק קישור
              </Button>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQRDialog(false)}>סגור</Button>
        </DialogActions>
      </Dialog>
      
      {/* דיאלוג ליצירת הזמנה חדשה */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>יצירת הזמנה חדשה</DialogTitle>
        <DialogContent>
          <DialogContentText>
            האם ברצונך ליצור קוד הזמנה חדש? הקוד יהיה בתוקף למשך שבוע.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>ביטול</Button>
          <Button onClick={createInvitation} color="primary">יצירה</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ManageInvitations;