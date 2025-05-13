// frontend/src/pages/PersonalChat.js
import React, { useState, useEffect, useRef } from 'react';
import { Container, Paper, Typography, TextField, Button, List, ListItem, ListItemText, CircularProgress, Divider } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

const PersonalChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // פונקציה לגלילה אוטומטית לסוף הצ'אט
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // טעינת הצ'אט
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/chats/personal', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.data.success) {
          setMessages(response.data.data.messages || []);
        }
      } catch (error) {
        setError("שגיאה בטעינת הצאט");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    
    // הגדרת פולינג לעדכון הודעות חדשות
    const interval = setInterval(fetchMessages, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // גלילה לסוף כאשר מתקבלות הודעות חדשות
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // שליחת הודעה חדשה
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      const response = await axios.post('/api/chats/personal/message', 
        { content: newMessage },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      
      if (response.data.success) {
        // הוספת ההודעה החדשה לרשימה
        setMessages([...messages, {
          sender: 'user',
          content: newMessage,
          sentAt: new Date().toISOString()
        }]);
        setNewMessage('');
      }
    } catch (error) {
      setError('שגיאה בשליחת ההודעה');
      console.error(error);
    }
  };

  return (
    <Container maxWidth="md" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
      <Paper elevation={3} style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f5f5f5' }}>
          <Typography variant="h5">הבוט האישי שלך</Typography>
          <Typography variant="body2" color="textSecondary">
            אני כאן כדי לעזור לך למצוא את הקבוצה המתאימה עבורך
            </Typography>
        </div>
        
        <div style={{ flexGrow: 1, overflow: 'auto', padding: '1rem', backgroundColor: '#f9f9f9' }}>
          {loading && messages.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </div>
          ) : error ? (
            <Typography variant="body1" color="error" align="center">{error}</Typography>
          ) : (
            <List>
              {messages.map((message, index) => (
                <React.Fragment key={index}>
                  <ListItem 
                    alignItems="flex-start"
                    style={{ 
                      flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                      padding: '0.5rem 1rem'
                    }}
                  >
                    <Paper 
                      elevation={1} 
                      style={{ 
                        padding: '0.75rem 1rem',
                        maxWidth: '70%',
                        backgroundColor: message.sender === 'user' ? '#e3f2fd' : '#ffffff',
                        borderRadius: message.sender === 'user' ? '15px 15px 0 15px' : '15px 15px 15px 0'
                      }}
                    >
                      <ListItemText
                        primary={message.content}
                        secondary={new Date(message.sentAt).toLocaleTimeString()}
                        primaryTypographyProps={{
                          style: { whiteSpace: 'pre-wrap' }
                        }}
                      />
                    </Paper>
                  </ListItem>
                  {index < messages.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
              <div ref={messagesEndRef} />
            </List>
          )}
        </div>
        
        <form 
          onSubmit={sendMessage}
          style={{ 
            display: 'flex', 
            padding: '1rem', 
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#f5f5f5'
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="הקלד הודעה..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            InputProps={{ 
              style: { borderRadius: '20px' }
            }}
          />
          <Button 
            type="submit"
            variant="contained" 
            color="primary"
            endIcon={<SendIcon />}
            style={{ 
              marginRight: '0.5rem',
              marginLeft: '0.5rem',
              borderRadius: '20px'
            }}
            disabled={!newMessage.trim()}
          >
            שלח
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default PersonalChat;