// frontend/src/pages/Onboarding.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, TextField, Button, Stepper, Step, StepLabel, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';

const Onboarding = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitationValid, setInvitationValid] = useState(false);
  
  const [userData, setUserData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode
  });

  // בדיקת תוקף ההזמנה
  useEffect(() => {
    const validateInvitation = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/invitations/${inviteCode}/validate`);
        if (response.data.success) {
          setInvitationValid(true);
        } else {
          setError('קוד ההזמנה אינו תקף');
        }
      } catch (error) {
        setError('קוד ההזמנה אינו תקף או פג תוקף');
      } finally {
        setLoading(false);
      }
    };

    if (inviteCode) {
      validateInvitation();
    } else {
      setError('חסר קוד הזמנה');
      setLoading(false);
    }
  }, [inviteCode]);

  const handleChange = (e) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userData.password !== userData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/users/register-with-invitation', userData);
      
      if (response.data.success) {
        // שמירת הטוקן ב-localStorage
        localStorage.setItem('token', response.data.data.token);
        // מעבר לדף הצ'אט עם הבוט האישי
        navigate('/personal-chat');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'אירעה שגיאה בתהליך הרישום');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['בדיקת הזמנה', 'פרטים אישיים', 'יצירת חשבון'];

  if (loading && activeStep === 0) {
    return (
      <Container maxWidth="sm" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" style={{ marginTop: '1rem' }}>
          בודק את תוקף ההזמנה...
        </Typography>
      </Container>
    );
  }

  if (error && activeStep === 0) {
    return (
      <Container maxWidth="sm" style={{ marginTop: '2rem' }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth 
          style={{ marginTop: '1rem' }}
          onClick={() => navigate('/')}
        >
          חזרה לדף הבית
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" style={{ marginTop: '2rem' }}>
      <Paper elevation={3} style={{ padding: '2rem' }}>
        <Typography variant="h4" gutterBottom align="center">
          הצטרפות למערכת שחרור
        </Typography>
        
        <Stepper activeStep={activeStep} alternativeLabel style={{ marginBottom: '2rem' }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {activeStep === 0 && invitationValid && (
          <>
            <Alert severity="success">קוד ההזמנה תקף!</Alert>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              style={{ marginTop: '1rem' }}
              onClick={() => setActiveStep(1)}
            >
              המשך
            </Button>
          </>
        )}
        
        {activeStep === 1 && (
          <form>
            <TextField
              name="name"
              label="שם מלא"
              variant="outlined"
              fullWidth
              margin="normal"
              value={userData.name}
              onChange={handleChange}
              required
            />
            <TextField
              name="phone"
              label="מספר טלפון"
              variant="outlined"
              fullWidth
              margin="normal"
              value={userData.phone}
              onChange={handleChange}
              required
            />
            <TextField
              name="email"
              label="אימייל"
              type="email"
              variant="outlined"
              fullWidth
              margin="normal"
              value={userData.email}
              onChange={handleChange}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <Button 
                variant="outlined" 
                onClick={() => setActiveStep(0)}
              >
                חזרה
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => setActiveStep(2)}
              >
                המשך
              </Button>
            </div>
          </form>
        )}
        
        {activeStep === 2 && (
          <form onSubmit={handleSubmit}>
            <TextField
              name="password"
              label="סיסמה"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={userData.password}
              onChange={handleChange}
              required
            />
            <TextField
              name="confirmPassword"
              label="אימות סיסמה"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={userData.confirmPassword}
              onChange={handleChange}
              required
            />
            
            {error && <Alert severity="error" style={{ marginTop: '1rem' }}>{error}</Alert>}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <Button 
                variant="outlined" 
                onClick={() => setActiveStep(1)}
              >
                חזרה
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                type="submit"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'סיום והרשמה'}
              </Button>
            </div>
          </form>
        )}
      </Paper>
    </Container>
  );
};

export default Onboarding;