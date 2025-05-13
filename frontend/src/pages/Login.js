// frontend/src/pages/Login.js
import React, { useState } from 'react';
import { Container, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/users/login', formData);
      
      if (response.data.success) {
        // שמירת הטוקן ב-localStorage
        localStorage.setItem('token', response.data.data.token);
        
        // מעבר לדף הראשי
        navigate('/dashboard');
      } else {
        setError(response.data.message || 'אירעה שגיאה בהתחברות');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'אירעה שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: '2rem' }}>
      <Paper elevation={3} style={{ padding: '2rem' }}>
        <Typography variant="h4" gutterBottom align="center">
          כניסה למערכת
        </Typography>
        
        {error && <Alert severity="error" style={{ marginBottom: '1rem' }}>{error}</Alert>}
        
        <form onSubmit={handleSubmit}>
          <TextField
            name="phone"
            label="מספר טלפון"
            variant="outlined"
            fullWidth
            margin="normal"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <TextField
            name="password"
            label="סיסמה"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <Button 
            type="submit"
            variant="contained" 
            color="primary"
            fullWidth
            style={{ marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'מתחבר...' : 'התחברות'}
          </Button>
        </form>
        
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Typography variant="body2">
            אין לך חשבון עדיין? <Button color="primary" onClick={() => navigate('/register')}>הרשמה</Button>
          </Typography>
        </div>
      </Paper>
    </Container>
  );
};

export default Login;