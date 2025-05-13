import React, { useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Button,
  Tooltip
} from '@mui/material';
import {
  Warning as WarningIcon,
  ErrorOutline as ErrorOutlineIcon,
  InfoOutlined as InfoOutlinedIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Forum as ForumIcon
} from '@mui/icons-material';

/**
 * מיפוי סוגי התראות לצבעים ואייקונים
 */
const alertTypes = {
  emergency: {
    color: '#d32f2f',
    icon: <ErrorOutlineIcon />,
    label: 'חירום'
  },
  warning: {
    color: '#ed6c02',
    icon: <WarningIcon />,
    label: 'אזהרה'
  },
  info: {
    color: '#0288d1',
    icon: <InfoOutlinedIcon />,
    label: 'מידע'
  },
  success: {
    color: '#2e7d32',
    icon: <CheckCircleOutlineIcon />,
    label: 'עדכון חיובי'
  }
};

/**
 * קומפוננט פאנל התראות - מציג רשימת התראות מערכת
 * 
 * @param {Object} props
 * @param {Array} props.alerts - רשימת התראות
 * @param {function} props.onAlertAction - פונקציית callback לפעולה על התראה
 * @param {function} props.onAlertDismiss - פונקציית callback לסימון התראה כטופלה
 * @param {boolean} props.showHeader - האם להציג כותרת
 * @param {string} props.title - כותרת הפאנל
 * @param {number} props.maxAlerts - מספר מקסימלי של התראות להצגה
 */
const AlertPanel = ({
  alerts = [],
  onAlertAction,
  onAlertDismiss,
  showHeader = true,
  title = 'התראות מערכת',
  maxAlerts = 10
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // חלוקת התראות לקטגוריות
  const newAlerts = alerts.filter(alert => !alert.isRead);
  const allAlerts = alerts.slice(0, maxAlerts);
  
  // טיפול בפתיחת תפריט
  const handleMenuOpen = (event, alert) => {
    setAnchorEl(event.currentTarget);
    setSelectedAlert(alert);
  };
  
  // טיפול בסגירת תפריט
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // טיפול בפעולות תפריט
  const handleMenuAction = (action) => {
    if (!selectedAlert) return;
    
    switch (action) {
      case 'dismiss':
        if (onAlertDismiss) {
          onAlertDismiss(selectedAlert);
        }
        break;
      case 'view':
        if (onAlertAction) {
          onAlertAction(selectedAlert, 'view');
        }
        break;
      case 'delete':
        if (onAlertAction) {
          onAlertAction(selectedAlert, 'delete');
        }
        break;
      case 'contact':
        if (onAlertAction) {
          onAlertAction(selectedAlert, 'contact');
        }
        break;
      default:
        break;
    }
    
    handleMenuClose();
  };
  
  // פונקציה לעיצוב אייקון ההתראה
  const getAlertIcon = (type) => {
    return alertTypes[type]?.icon || <InfoOutlinedIcon />;
  };
  
  // פונקציה לעיצוב צבע ההתראה
  const getAlertColor = (type) => {
    return alertTypes[type]?.color || '#757575';
  };
  
  // פונקציה לעיצוב תווית ההתראה
  const getAlertLabel = (type) => {
    return alertTypes[type]?.label || 'התראה';
  };
  
  // פונקציה להמרת תאריך לפורמט קריא
  const formatDate = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const alertDate = new Date(date);
    const diffMs = now - alertDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
      return `לפני ${diffMins} דקות`;
    } else if (diffHours < 24) {
      return `לפני ${diffHours} שעות`;
    } else if (diffDays < 7) {
      return `לפני ${diffDays} ימים`;
    } else {
      return alertDate.toLocaleDateString('he-IL');
    }
  };
  
  // רינדור פריט התראה
  const renderAlertItem = (alert) => {
    const { _id, type, title, message, createdAt, entity, isRead } = alert;
    const color = getAlertColor(type);
    
    return (
      <ListItem
        key={_id}
        alignItems="flex-start"
        sx={{
          opacity: isRead ? 0.7 : 1,
          backgroundColor: isRead ? 'inherit' : `${color}10`,
          '&:hover': {
            backgroundColor: `${color}15`
          },
          borderRight: `3px solid ${color}`
        }}
        secondaryAction={
          <IconButton edge="end" onClick={(e) => handleMenuOpen(e, alert)}>
            <MoreVertIcon />
          </IconButton>
        }
      >
        <ListItemAvatar>
          {entity?.type === 'user' ? (
            <Avatar src={entity.profileImage}>
              <PersonIcon />
            </Avatar>
          ) : entity?.type === 'group' ? (
            <Avatar sx={{ bgcolor: 'primary.light' }}>
              <GroupIcon />
            </Avatar>
          ) : (
            <Avatar sx={{ bgcolor: color }}>
              {getAlertIcon(type)}
            </Avatar>
          )}
        </ListItemAvatar>
        
        <ListItemText
          primary={
            <Box display="flex" alignItems="flex-start" pr={4}>
              <Typography variant="subtitle2" component="div" sx={{ fontWeight: isRead ? 'normal' : 'bold', flexGrow: 1 }}>
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, textAlign: 'left' }}>
                {formatDate(createdAt)}
              </Typography>
            </Box>
          }
          secondary={
            <Box>
              <Typography variant="body2" color="text.primary" component="span">
                {message}
              </Typography>
              
              {entity && (
                <Box mt={0.5}>
                  <Chip
                    size="small"
                    icon={entity.type === 'user' ? <PersonIcon fontSize="small" /> : <GroupIcon fontSize="small" />}
                    label={entity.name}
                    sx={{ mr: 0.5 }}
                  />
                  <Chip
                    size="small"
                    label={getAlertLabel(type)}
                    sx={{ backgroundColor: color, color: 'white', fontSize: 10 }}
                  />
                </Box>
              )}
            </Box>
          }
        />
      </ListItem>
    );
  };
  
  return (
    <Card sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showHeader && (
        <CardHeader
          title={
            <Box display="flex" alignItems="center">
              <Badge color="error" badgeContent={newAlerts.length} sx={{ mr: 1 }}>
                <NotificationsIcon />
              </Badge>
              <Typography variant="h6" component="div">
                {title}
              </Typography>
            </Box>
          }
          action={
            <Box>
              <Tooltip title="סמן הכל כנקרא">
                <IconButton size="small" onClick={() => {
                  if (onAlertAction) onAlertAction(null, 'markAllRead');
                }}>
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="מחק הכל">
                <IconButton size="small" onClick={() => {
                  if (onAlertAction) onAlertAction(null, 'deleteAll');
                }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />
      )}
      
      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
      >
        <Tab 
          label={
            <Box display="flex" alignItems="center">
              <Typography variant="body2" component="span">
                חדשות
              </Typography>
              {newAlerts.length > 0 && (
                <Chip
                  size="small"
                  label={newAlerts.length}
                  color="error"
                  sx={{ ml: 1, height: 20, minWidth: 20 }}
                />
              )}
            </Box>
          } 
          id="tab-0"
        />
        <Tab 
          label="כל ההתראות" 
          id="tab-1"
        />
      </Tabs>
      
      <CardContent sx={{ p: 0, flexGrow: 1, overflow: 'auto' }}>
        {tabValue === 0 && (
          <List sx={{ width: '100%', p: 0 }}>
            {newAlerts.length === 0 ? (
              <Box p={3} textAlign="center">
                <NotificationsOffIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  אין התראות חדשות
                </Typography>
              </Box>
            ) : (
              newAlerts.map((alert, index) => (
                <React.Fragment key={alert._id || index}>
                  {renderAlertItem(alert)}
                  {index < newAlerts.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))
            )}
          </List>
        )}
        
        {tabValue === 1 && (
          <List sx={{ width: '100%', p: 0 }}>
            {allAlerts.length === 0 ? (
              <Box p={3} textAlign="center">
                <NotificationsOffIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  אין התראות
                </Typography>
              </Box>
            ) : (
              allAlerts.map((alert, index) => (
                <React.Fragment key={alert._id || index}>
                  {renderAlertItem(alert)}
                  {index < allAlerts.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))
            )}
          </List>
        )}
      </CardContent>
      
      {/* תפריט פעולות */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleMenuAction('view')}>
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>הצג פרטים</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('dismiss')}>
          <ListItemIcon>
            <CheckCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>סמן כטופל</ListItemText>
        </MenuItem>
        {selectedAlert?.entity?.type === 'user' && (
          <MenuItem onClick={() => handleMenuAction('contact')}>
            <ListItemIcon>
              <ForumIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>יצירת קשר</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => handleMenuAction('delete')}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>מחק</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default AlertPanel;