import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Chip,
  Box,
  TextField,
  InputAdornment,
  Divider,
  Badge,
  Menu,
  MenuItem,
  Paper
} from '@mui/material';
import {
  Group as GroupIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  ArrowLeft as ArrowLeftIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

// מיפוי צבעים לסוגי קבוצות
const groupTypeColors = {
  support: '#4caf50',    // ירוק - קבוצות תמיכה
  activity: '#2196f3',   // כחול - קבוצות פעילות
  interest: '#ff9800',   // כתום - קבוצות תחומי עניין
  location: '#9c27b0'    // סגול - קבוצות מבוססות מיקום
};

// מיפוי סוגי קבוצות לטקסט בעברית
const groupTypeLabels = {
  support: 'קבוצת תמיכה',
  activity: 'קבוצת פעילות',
  interest: 'קבוצת עניין',
  location: 'קבוצה אזורית'
};

/**
 * קומפוננט רשימת קבוצות - מציג רשימה של קבוצות WhatsApp במערכת
 * 
 * @param {Object} props
 * @param {Array} props.groups - מערך של אובייקטי קבוצה
 * @param {function} props.onGroupSelect - פונקציית callback לבחירת קבוצה
 * @param {function} props.onGroupMessage - פונקציית callback לשליחת הודעה לקבוצה
 * @param {function} props.onGroupManage - פונקציית callback לניהול קבוצה
 * @param {boolean} props.showFilters - האם להציג פילטרים
 * @param {string} props.selectedGroupId - מזהה הקבוצה הנבחרת כרגע
 */
const GroupList = ({
  groups = [],
  onGroupSelect,
  onGroupMessage,
  onGroupManage,
  showFilters = true,
  selectedGroupId = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // פילטור קבוצות לפי חיפוש
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // טיפול בפתיחת תפריט
  const handleMenuOpen = (event, group) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
  };

  // טיפול בסגירת תפריט
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // טיפול בפעולות תפריט
  const handleMenuAction = (action) => {
    if (!selectedGroup) return;

    switch (action) {
      case 'message':
        onGroupMessage?.(selectedGroup);
        break;
      case 'manage':
        onGroupManage?.(selectedGroup);
        break;
      default:
        break;
    }

    handleMenuClose();
  };

  // עיצוב אווטאר הקבוצה על פי סוג הקבוצה
  const getGroupAvatar = (group) => {
    if (group.imageUrl) {
      return <Avatar src={group.imageUrl} alt={group.name} />;
    }
    
    return (
      <Avatar
        sx={{
          bgcolor: groupTypeColors[group.type] || '#757575'
        }}
      >
        <GroupIcon />
      </Avatar>
    );
  };

  // חישוב מספר ההתראות בקבוצה
  const getAlertCount = (group) => {
    let count = 0;
    
    // אם יש התראות ישירות על הקבוצה
    if (group.alerts) {
      count += group.alerts;
    }
    
    // אם יש התראות על חברים בקבוצה
    if (group.membersWithAlerts) {
      count += group.membersWithAlerts;
    }
    
    return count;
  };

  return (
    <Paper sx={{ width: '100%', maxWidth: 500, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {showFilters && (
        <Box p={2} pb={1}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="חיפוש קבוצות..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
        <List sx={{ width: '100%', padding: 0 }}>
          {filteredGroups.length === 0 ? (
            <Box p={2} textAlign="center">
              <Typography variant="body2" color="textSecondary">
                לא נמצאו קבוצות
              </Typography>
            </Box>
          ) : (
            filteredGroups.map((group, index) => {
              const isSelected = selectedGroupId === group._id;
              const alertCount = getAlertCount(group);

              return (
                <React.Fragment key={group._id || index}>
                  <ListItem
                    button
                    selected={isSelected}
                    onClick={() => onGroupSelect?.(group)}
                    sx={{
                      bgcolor: isSelected ? 'action.selected' : 'inherit',
                      '&:hover': {
                        bgcolor: isSelected ? 'action.selected' : 'action.hover',
                      },
                      pr: 7 // מרווח לכפתורי פעולה
                    }}
                  >
                    <ListItemAvatar>
                      {alertCount > 0 ? (
                        <Badge
                          color="error"
                          badgeContent={alertCount}
                          overlap="circular"
                        >
                          {getGroupAvatar(group)}
                        </Badge>
                      ) : (
                        getGroupAvatar(group)
                      )}
                    </ListItemAvatar>

                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          <Typography
                            variant="subtitle1"
                            component="span"
                            sx={{ fontWeight: isSelected ? 'bold' : 'normal' }}
                          >
                            {group.name}
                          </Typography>
                          {group.isActive === false && (
                            <Chip
                              size="small"
                              label="לא פעילה"
                              sx={{ ml: 1, backgroundColor: '#a5a5a5', color: 'white', fontSize: 10 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Chip
                            size="small"
                            label={groupTypeLabels[group.type] || group.type}
                            sx={{
                              backgroundColor: groupTypeColors[group.type] || '#757575',
                              color: 'white',
                              fontSize: 10,
                              height: 20,
                              mr: 1,
                              mb: 0.5
                            }}
                          />
                          <Typography
                            variant="body2"
                            component="span"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            {group.members?.length || 0} חברים
                            {group.membersAtRisk > 0 && (
                              <Box component="span" sx={{ color: 'error.main', ml: 1 }}>
                                <WarningIcon fontSize="inherit" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />
                                {group.membersAtRisk} במצוקה
                              </Box>
                            )}
                          </Typography>
                        </Box>
                      }
                      secondaryTypographyProps={{
                        component: 'div'
                      }}
                      dir="rtl"
                    />
                    
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        onClick={(e) => handleMenuOpen(e, group)}
                        aria-label="פעולות נוספות"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {index < filteredGroups.length - 1 && <Divider />}
                </React.Fragment>
              );
            })
          )}
        </List>
      </Box>

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
        <MenuItem onClick={() => handleMenuAction('message')}>
          <MessageIcon fontSize="small" sx={{ mr: 1 }} />
          שליחת הודעה
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('manage')}>
          <NotificationsIcon fontSize="small" sx={{ mr: 1 }} />
          ניהול קבוצה
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default GroupList;