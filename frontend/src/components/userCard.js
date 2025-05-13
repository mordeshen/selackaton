import React from 'react';
import { Card, CardContent, CardActions, Avatar, Typography, Chip, Box, Button, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Phone as PhoneIcon, Message as MessageIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';

const StatusChip = styled(Chip)(({ theme, status }) => ({
  backgroundColor: 
    status === 'active' ? theme.palette.success.light :
    status === 'inactive' ? theme.palette.grey[500] :
    status === 'risk' ? theme.palette.error.light :
    status === 'new' ? theme.palette.info.light :
    theme.palette.grey[300],
  color: 
    status === 'active' ? theme.palette.success.contrastText :
    status === 'inactive' ? theme.palette.grey[50] :
    status === 'risk' ? theme.palette.error.contrastText :
    status === 'new' ? theme.palette.info.contrastText :
    theme.palette.grey[900],
  fontWeight: 'bold',
  fontSize: '0.75rem'
}));

// תיאור מצבי משתמש
const statusMap = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  risk: 'במצוקה',
  new: 'חדש'
};

/**
 * קומפוננט כרטיס משתמש - מציג מידע על משתמש יחיד במערכת
 * 
 * @param {Object} props
 * @param {Object} props.user - נתוני המשתמש
 * @param {function} props.onContact - פונקציית callback ליצירת קשר
 * @param {function} props.onMessage - פונקציית callback לשליחת הודעה
 * @param {function} props.onViewDetails - פונקציית callback להצגת פרטים נוספים
 * @param {boolean} props.compact - האם להציג בגרסה מצומצמת
 * @param {boolean} props.hideActions - האם להסתיר את כפתורי הפעולה
 */
const UserCard = ({ 
  user, 
  onContact, 
  onMessage, 
  onViewDetails,
  compact = false,
  hideActions = false
}) => {
  if (!user) return null;

  const { 
    name, 
    phoneNumber, 
    profileImageUrl, 
    status = 'active', 
    groups = [], 
    joinDate,
    riskLevel = 0
  } = user;

  const joinDateFormatted = new Date(joinDate).toLocaleDateString('he-IL');
  
  return (
    <Card 
      sx={{ 
        width: compact ? '100%' : 300, 
        boxShadow: status === 'risk' ? '0 0 8px rgba(244, 67, 54, 0.5)' : 'inherit',
        border: status === 'risk' ? '1px solid #f44336' : 'none',
        height: compact ? 'auto' : '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" mb={compact ? 1 : 2}>
          <Avatar 
            src={profileImageUrl} 
            sx={{ width: compact ? 40 : 56, height: compact ? 40 : 56, mr: 2 }}
          >
            {name?.charAt(0) || '?'}
          </Avatar>
          <Box>
            <Typography variant={compact ? "body1" : "h6"} component="div" sx={{ fontWeight: 'bold' }}>
              {name}
            </Typography>
            {!compact && (
              <Typography variant="body2" color="text.secondary">
                {phoneNumber}
              </Typography>
            )}
            <Box mt={0.5}>
              <StatusChip 
                label={statusMap[status] || 'לא ידוע'} 
                status={status} 
                size="small" 
              />
            </Box>
          </Box>
          {!compact && !hideActions && (
            <IconButton size="small" sx={{ ml: 'auto' }}>
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>

        {!compact && (
          <>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>תאריך הצטרפות:</strong> {joinDateFormatted}
            </Typography>
            
            {riskLevel > 0 && (
              <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                <strong>רמת סיכון:</strong> {riskLevel}/10
              </Typography>
            )}
            
            {groups.length > 0 && (
              <Box mt={1}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>קבוצות:</strong>
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {groups.slice(0, 3).map((group, index) => (
                    <Chip key={index} label={group.name} size="small" />
                  ))}
                  {groups.length > 3 && (
                    <Chip label={`+${groups.length - 3}`} size="small" variant="outlined" />
                  )}
                </Box>
              </Box>
            )}
          </>
        )}
      </CardContent>

      {!hideActions && (
        <CardActions sx={{ justifyContent: 'space-between', mt: 'auto' }}>
          <Button 
            size="small" 
            startIcon={<PhoneIcon />} 
            onClick={() => onContact?.(user)}
          >
            יצירת קשר
          </Button>
          <Button 
            size="small" 
            startIcon={<MessageIcon />} 
            onClick={() => onMessage?.(user)}
          >
            הודעה
          </Button>
          <Button 
            size="small" 
            onClick={() => onViewDetails?.(user)}
          >
            פרטים
          </Button>
        </CardActions>
      )}
    </Card>
  );
};

export default userCard;