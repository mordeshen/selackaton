import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  Switch,
  FormControlLabel,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import he from 'date-fns/locale/he';
import { useAuth } from '../context/AuthContext';
import { eventService } from '../services/eventService';
import { groupService } from '../services/groupService';

const EventManagement = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  // State variables
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Tabs
  const [tabValue, setTabValue] = useState(0);
  
  // Sorting
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    timeRange: 'all',
  });
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // Selected event for editing/deleting/sharing
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // New event data
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date(),
    time: new Date(),
    location: '',
    type: 'social',
    maxParticipants: 0,
    organizer: user?.name || '',
    imageUrl: '',
    isPublic: true,
  });
  
  // Groups for sharing
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);

  // Load events
  useEffect(() => {
    fetchEvents();
    fetchGroups();
  }, []);

  // Filter events when tab changes or filters change
  useEffect(() => {
    filterEvents();
  }, [events, tabValue, filters]);

  // Fetch events from API
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await eventService.getEvents();
      setEvents(data);
      setError(null);
    } catch (err) {
      setError('שגיאה בטעינת האירועים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch groups for sharing
  const fetchGroups = async () => {
    try {
      const data = await groupService.getGroups();
      setAvailableGroups(data);
    } catch (err) {
      console.error('שגיאה בטעינת הקבוצות:', err);
    }
  };

  // Filter events based on current filters
  const filterEvents = () => {
    let filtered = [...events];
    
    // Filter by tab (upcoming/past)
    const now = new Date();
    if (tabValue === 0) {
      // Upcoming events
      filtered = filtered.filter(event => new Date(event.date) >= now);
    } else {
      // Past events
      filtered = filtered.filter(event => new Date(event.date) < now);
    }
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchLower) ||
        (event.description && event.description.toLowerCase().includes(searchLower)) ||
        (event.location && event.location.toLowerCase().includes(searchLower)) ||
        (event.organizer && event.organizer.toLowerCase().includes(searchLower))
      );
    }
    
    // Filter by event type
    if (filters.type !== 'all') {
      filtered = filtered.filter(event => event.type === filters.type);
    }
    
    // Filter by time range
    if (filters.timeRange !== 'all' && tabValue === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekFromNow = new Date();
      weekFromNow.setDate(today.getDate() + 7);
      
      const monthFromNow = new Date();
      monthFromNow.setMonth(today.getMonth() + 1);
      
      switch (filters.timeRange) {
        case 'today':
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today && eventDate < new Date(today.getTime() + 86400000);
          });
          break;
        case 'week':
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today && eventDate <= weekFromNow;
          });
          break;
        case 'month':
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today && eventDate <= monthFromNow;
          });
          break;
        default:
          break;
      }
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'title':
          valueA = a.title.toLowerCase();
          valueB = b.title.toLowerCase();
          break;
        case 'date':
          valueA = new Date(a.date).getTime();
          valueB = new Date(b.date).getTime();
          break;
        case 'type':
          valueA = a.type;
          valueB = b.type;
          break;
        case 'location':
          valueA = (a.location || '').toLowerCase();
          valueB = (b.location || '').toLowerCase();
          break;
        case 'participants':
          valueA = a.participants ? a.participants.length : 0;
          valueB = b.participants ? b.participants.length : 0;
          break;
        default:
          valueA = new Date(a.date).getTime();
          valueB = new Date(b.date).getTime();
      }
      
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredEvents(filtered);
    // Reset pagination when filters change
    setPage(0);
  };

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Sort handler
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Filter change handlers
  const handleFilterChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value,
    });
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      timeRange: 'all',
    });
    setShowFilters(false);
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // New event handlers
  const handleNewEventChange = (event) => {
    const { name, value, type, checked } = event.target;
    setNewEvent({
      ...newEvent,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleNewEventDateChange = (date) => {
    setNewEvent({
      ...newEvent,
      date,
    });
  };

  const handleNewEventTimeChange = (time) => {
    setNewEvent({
      ...newEvent,
      time,
    });
  };

  // Edit event handlers
  const handleEditEventChange = (event) => {
    const { name, value, type, checked } = event.target;
    setSelectedEvent({
      ...selectedEvent,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleEditEventDateChange = (date) => {
    setSelectedEvent({
      ...selectedEvent,
      date,
    });
  };

  const handleEditEventTimeChange = (time) => {
    setSelectedEvent({
      ...selectedEvent,
      time,
    });
  };

  // Group selection handler for sharing
  const handleGroupSelectionChange = (event) => {
    setSelectedGroups(event.target.value);
  };

  // Open edit dialog
  const handleEditClick = (event) => {
    setSelectedEvent({
      ...event,
      date: new Date(event.date),
      time: new Date(event.date),
    });
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (event) => {
    setSelectedEvent(event);
    setDeleteDialogOpen(true);
  };

  // Open share dialog
  const handleShareClick = (event) => {
    setSelectedEvent(event);
    setSelectedGroups([]);
    setShareDialogOpen(true);
  };

  // Delete event
  const handleDeleteEvent = async () => {
    setSubmitting(true);
    try {
      await eventService.deleteEvent(selectedEvent._id);
      setSuccess(`האירוע "${selectedEvent.title}" נמחק בהצלחה`);
      setDeleteDialogOpen(false);
      await fetchEvents();
    } catch (err) {
      setError('שגיאה במחיקת האירוע');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Share event
  const handleShareEvent = async () => {
    setSubmitting(true);
    try {
      await eventService.shareEvent(selectedEvent._id, selectedGroups);
      setSuccess(`האירוע "${selectedEvent.title}" שותף בהצלחה עם ${selectedGroups.length} קבוצות`);
      setShareDialogOpen(false);
    } catch (err) {
      setError('שגיאה בשיתוף האירוע');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Save event (create or update)
  const handleSaveEvent = async (isNew) => {
    setSubmitting(true);
    try {
      const eventData = isNew ? newEvent : selectedEvent;
      
      // Combine date and time
      const combinedDate = new Date(eventData.date);
      const time = new Date(eventData.time);
      combinedDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
      
      const finalEvent = {
        ...eventData,
        date: combinedDate,
      };
      
      if (isNew) {
        await eventService.createEvent(finalEvent);
        setCreateDialogOpen(false);
        setNewEvent({
          title: '',
          description: '',
          date: new Date(),
          time: new Date(),
          location: '',
          type: 'social',
          maxParticipants: 0,
          organizer: user?.name || '',
          imageUrl: '',
          isPublic: true,
        });
        setSuccess('האירוע נוצר בהצלחה');
      } else {
        await eventService.updateEvent(finalEvent._id, finalEvent);
        setEditDialogOpen(false);
        setSuccess(`האירוע "${finalEvent.title}" עודכן בהצלחה`);
      }
      
      await fetchEvents();
    } catch (err) {
      setError(isNew ? 'שגיאה ביצירת האירוע' : 'שגיאה בעדכון האירוע');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Event card renderer (for mobile view)
  const renderEventCard = (event) => {
    const eventDate = new Date(event.date);
    const isPast = eventDate < new Date();
    
    return (
      <Grid item xs={12} key={event._id}>
        <Card sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          opacity: isPast ? 0.8 : 1,
        }}>
          {event.imageUrl && (
            <CardMedia
              component="img"
              height="140"
              image={event.imageUrl}
              alt={event.title}
            />
          )}
          
          <CardContent sx={{ flexGrow: 1 }}>
            <Typography gutterBottom variant="h6" component="div">
              {event.title}
            </Typography>
            
            <Box display="flex" alignItems="center" mb={1}>
              <CalendarIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {eventDate.toLocaleDateString('he-IL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>
            
            {event.location && (
              <Box display="flex" alignItems="center" mb={1}>
                <LocationIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {event.location}
                </Typography>
              </Box>
            )}
            
            <Box display="flex" alignItems="center" mb={1}>
              <PersonIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {event.organizer || 'לא צוין מארגן'}
              </Typography>
            </Box>
            
            <Box display="flex" alignItems="center">
              <GroupIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {event.participants ? `${event.participants.length} משתתפים` : '0 משתתפים'}
                {event.maxParticipants > 0 && ` (מקסימום ${event.maxParticipants})`}
              </Typography>
            </Box>
            
            {event.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {event.description.length > 100 
                  ? `${event.description.substring(0, 100)}...` 
                  : event.description}
              </Typography>
            )}
            
            <Box display="flex" mt={2}>
              <Chip 
                label={getEventTypeLabel(event.type)} 
                size="small" 
                color={getEventTypeColor(event.type)}
                sx={{ mr: 1 }}
              />
              {event.isPublic && <Chip label="פומבי" size="small" />}
            </Box>
          </CardContent>
          
          <CardActions>
            <Button 
              size="small" 
              startIcon={<EditIcon />}
              onClick={() => handleEditClick(event)}
            >
              עריכה
            </Button>
            <Button 
              size="small" 
              startIcon={<ShareIcon />}
              onClick={() => handleShareClick(event)}
            >
              שיתוף
            </Button>
            <Button 
              size="small" 
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => handleDeleteClick(event)}
            >
              מחיקה
            </Button>
          </CardActions>
        </Card>
      </Grid>
    );
  };

  // Event row renderer (for desktop/tablet view)
  const renderEventRow = (event) => {
    const eventDate = new Date(event.date);
    const isPast = eventDate < new Date();

    return (
      <TableRow key={event._id} sx={{ opacity: isPast ? 0.8 : 1 }}>
        <TableCell>
          <Box display="flex" alignItems="center">
            <Typography variant="subtitle2">{event.title}</Typography>
            {event.isPublic && (
              <Tooltip title="אירוע פומבי">
                <Chip label="פומבי" size="small" sx={{ ml: 1 }} />
              </Tooltip>
            )}
          </Box>
        </TableCell>
        <TableCell>
          {eventDate.toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </TableCell>
        <TableCell>
          <Chip 
            label={getEventTypeLabel(event.type)} 
            size="small" 
            color={getEventTypeColor(event.type)}
          />
        </TableCell>
        <TableCell>{event.location || '-'}</TableCell>
        <TableCell>{event.organizer || '-'}</TableCell>
        <TableCell>
          <Box display="flex" alignItems="center">
            <GroupIcon fontSize="small" sx={{ mr: 0.5 }} />
            {event.participants ? event.participants.length : '0'}
            {event.maxParticipants > 0 && ` / ${event.maxParticipants}`}
          </Box>
        </TableCell>
        <TableCell>
          <Tooltip title="ערוך אירוע">
            <IconButton size="small" onClick={() => handleEditClick(event)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="שתף אירוע">
            <IconButton size="small" onClick={() => handleShareClick(event)}>
              <ShareIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="מחק אירוע">
            <IconButton size="small" onClick={() => handleDeleteClick(event)}>
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
    );
  };

  // Helper function to get event type label
  const getEventTypeLabel = (type) => {
    switch (type) {
      case 'social': return 'חברתי';
      case 'support': return 'תמיכה';
      case 'workshop': return 'סדנה';
      case 'lecture': return 'הרצאה';
      case 'activity': return 'פעילות';
      default: return type;
    }
  };

  // Helper function to get event type color
  const getEventTypeColor = (type) => {
    switch (type) {
      case 'social': return 'primary';
      case 'support': return 'success';
      case 'workshop': return 'secondary';
      case 'lecture': return 'info';
      case 'activity': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h1">
            ניהול אירועים
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            יצירת אירוע חדש
          </Button>
        </Box>

        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="אירועים עתידיים" />
          <Tab label="אירועים שהתקיימו" />
        </Tabs>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <TextField
            placeholder="חיפוש..."
            size="small"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: '30%' }}
          />
          
          <Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ mr: 1 }}
            >
              סינון מתקדם
            </Button>
          </Box>
        </Box>
        
        {showFilters && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.level1', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="filter-type-label">סוג אירוע</InputLabel>
                  <Select
                    labelId="filter-type-label"
                    name="type"
                    value={filters.type}
                    onChange={handleFilterChange}
                    label="סוג אירוע"
                  >
                    <MenuItem value="all">הכל</MenuItem>
                    <MenuItem value="social">חברתי</MenuItem>
                    <MenuItem value="support">תמיכה</MenuItem>
                    <MenuItem value="workshop">סדנה</MenuItem>
                    <MenuItem value="lecture">הרצאה</MenuItem>
                    <MenuItem value="activity">פעילות</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="filter-timerange-label">טווח זמן</InputLabel>
                  <Select
                    labelId="filter-timerange-label"
                    name="timeRange"
                    value={filters.timeRange}
                    onChange={handleFilterChange}
                    label="טווח זמן"
                    disabled={tabValue === 1}
                  >
                    <MenuItem value="all">הכל</MenuItem>
                    <MenuItem value="today">היום</MenuItem>
                    <MenuItem value="week">השבוע</MenuItem>
                    <MenuItem value="month">החודש</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box mt={2} display="flex" justifyContent="flex-end">
              <Button
                variant="text"
                onClick={handleClearFilters}
                startIcon={<CloseIcon />}
              >
                נקה פילטרים
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* הודעת שגיאה */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* תוכן - טעינה */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1}>
          <CircularProgress />
        </Box>
      ) : filteredEvents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            לא נמצאו אירועים
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {tabValue === 0 
              ? 'נסה ליצור אירוע חדש או לשנות את הפילטרים' 
              : 'אין אירועים שהתקיימו בעבר או נסה לשנות את הפילטרים'}
          </Typography>
        </Paper>
      ) : (
        <>
          {/* תוכן - תצוגת כרטיסים */}
          {isMobile && (
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Grid container spacing={2}>
                {filteredEvents
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map(renderEventCard)}
              </Grid>
            </Box>
          )}

          {/* תוכן - תצוגת טבלה */}
          {!isMobile && (
            <TableContainer component={Paper} sx={{ flexGrow: 1 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell 
                      sortDirection={sortBy === 'title' ? sortDirection : false}
                      onClick={() => handleSort('title')}
                      style={{ cursor: 'pointer' }}
                    >
                      <Box display="flex" alignItems="center">
                        כותרת
                        {sortBy === 'title' && (
                          <Box component="span" ml={0.5}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sortDirection={sortBy === 'date' ? sortDirection : false}
                      onClick={() => handleSort('date')}
                      style={{ cursor: 'pointer' }}
                    >
                      <Box display="flex" alignItems="center">
                        תאריך ושעה
                        {sortBy === 'date' && (
                          <Box component="span" ml={0.5}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sortDirection={sortBy === 'type' ? sortDirection : false}
                      onClick={() => handleSort('type')}
                      style={{ cursor: 'pointer' }}
                    >
                      <Box display="flex" alignItems="center">
                        סוג
                        {sortBy === 'type' && (
                          <Box component="span" ml={0.5}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sortDirection={sortBy === 'location' ? sortDirection : false}
                      onClick={() => handleSort('location')}
                      style={{ cursor: 'pointer' }}
                    >
                      <Box display="flex" alignItems="center">
                        מיקום
                        {sortBy === 'location' && (
                          <Box component="span" ml={0.5}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>מארגן</TableCell>
                    <TableCell 
                      sortDirection={sortBy === 'participants' ? sortDirection : false}
                      onClick={() => handleSort('participants')}
                      style={{ cursor: 'pointer' }}
                    >
                      <Box display="flex" alignItems="center">
                        משתתפים
                        {sortBy === 'participants' && (
                          <Box component="span" ml={0.5}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEvents
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map(renderEventRow)}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* דפדוף */}
          <TablePagination
            component="div"
            count={filteredEvents.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="שורות בעמוד:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} מתוך ${count}`}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </>
      )}

      
{/* הודעת הצלחה */}
<Snackbar 
open={Boolean(success)} 
autoHideDuration={6000} 
onClose={() => setSuccess(null)}
anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
>
<Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
  {success}
</Alert>
</Snackbar>

{/* דיאלוג יצירת אירוע */}
<Dialog 
open={createDialogOpen} 
onClose={() => setCreateDialogOpen(false)}
fullWidth
maxWidth="md"
>
<DialogTitle>יצירת אירוע חדש</DialogTitle>
<DialogContent>
  <Grid container spacing={2} sx={{ mt: 1 }}>
    <Grid item xs={12} sm={6}>
      <TextField
        name="title"
        label="כותרת האירוע"
        value={newEvent.title}
        onChange={handleNewEventChange}
        fullWidth
        required
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth>
        <InputLabel id="new-event-type-label">סוג אירוע</InputLabel>
        <Select
          labelId="new-event-type-label"
          name="type"
          value={newEvent.type}
          onChange={handleNewEventChange}
          label="סוג אירוע"
        >
          <MenuItem value="social">חברתי</MenuItem>
          <MenuItem value="support">תמיכה</MenuItem>
          <MenuItem value="workshop">סדנה</MenuItem>
          <MenuItem value="lecture">הרצאה</MenuItem>
          <MenuItem value="activity">פעילות</MenuItem>
        </Select>
      </FormControl>
    </Grid>
    <Grid item xs={12} sm={6}>
      <LocalizationProvider dateAdapter={AdapterDateFns} locale={he}>
        <DatePicker
          label="תאריך"
          value={newEvent.date}
          onChange={handleNewEventDateChange}
          renderInput={(params) => <TextField {...params} fullWidth />}
        />
      </LocalizationProvider>
    </Grid>
    <Grid item xs={12} sm={6}>
      <LocalizationProvider dateAdapter={AdapterDateFns} locale={he}>
        <TimePicker
          label="שעה"
          value={newEvent.time}
          onChange={handleNewEventTimeChange}
          renderInput={(params) => <TextField {...params} fullWidth />}
        />
      </LocalizationProvider>
    </Grid>
    <Grid item xs={12}>
      <TextField
        name="location"
        label="מיקום"
        value={newEvent.location}
        onChange={handleNewEventChange}
        fullWidth
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        name="organizer"
        label="מארגן"
        value={newEvent.organizer}
        onChange={handleNewEventChange}
        fullWidth
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        name="maxParticipants"
        label="מספר משתתפים מקסימלי"
        value={newEvent.maxParticipants}
        onChange={handleNewEventChange}
        type="number"
        InputProps={{ inputProps: { min: 0 } }}
        fullWidth
        helperText="0 = ללא הגבלה"
      />
    </Grid>
    <Grid item xs={12}>
      <TextField
        name="imageUrl"
        label="קישור לתמונה"
        value={newEvent.imageUrl}
        onChange={handleNewEventChange}
        fullWidth
      />
    </Grid>
    <Grid item xs={12}>
      <TextField
        name="description"
        label="תיאור"
        value={newEvent.description}
        onChange={handleNewEventChange}
        multiline
        rows={4}
        fullWidth
      />
    </Grid>
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={newEvent.isPublic}
            onChange={handleNewEventChange}
            name="isPublic"
          />
        }
        label="אירוע פומבי"
      />
      <FormHelperText>
        אירועים פומביים נראים לכל המשתמשים במערכת
      </FormHelperText>
    </Grid>
  </Grid>
</DialogContent>
<DialogActions>
  <Button 
    onClick={() => setCreateDialogOpen(false)} 
    disabled={submitting}
  >
    ביטול
  </Button>
  <Button 
    onClick={() => handleSaveEvent(true)} 
    color="primary" 
    disabled={submitting || !newEvent.title}
    variant="contained"
  >
    {submitting ? <CircularProgress size={24} /> : 'שמור אירוע'}
  </Button>
</DialogActions>
</Dialog>

{/* דיאלוג עריכת אירוע */}
<Dialog 
open={editDialogOpen} 
onClose={() => setEditDialogOpen(false)}
fullWidth
maxWidth="md"
>
<DialogTitle>עריכת אירוע</DialogTitle>
<DialogContent>
  {selectedEvent && (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} sm={6}>
        <TextField
          name="title"
          label="כותרת האירוע"
          value={selectedEvent.title}
          onChange={handleEditEventChange}
          fullWidth
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel id="edit-event-type-label">סוג אירוע</InputLabel>
          <Select
            labelId="edit-event-type-label"
            name="type"
            value={selectedEvent.type}
            onChange={handleEditEventChange}
            label="סוג אירוע"
          >
            <MenuItem value="social">חברתי</MenuItem>
            <MenuItem value="support">תמיכה</MenuItem>
            <MenuItem value="workshop">סדנה</MenuItem>
            <MenuItem value="lecture">הרצאה</MenuItem>
            <MenuItem value="activity">פעילות</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <LocalizationProvider dateAdapter={AdapterDateFns} locale={he}>
          <DatePicker
            label="תאריך"
            value={selectedEvent.date}
            onChange={handleEditEventDateChange}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>
      </Grid>
      <Grid item xs={12} sm={6}>
        <LocalizationProvider dateAdapter={AdapterDateFns} locale={he}>
          <TimePicker
            label="שעה"
            value={selectedEvent.time}
            onChange={handleEditEventTimeChange}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>
      </Grid>
      <Grid item xs={12}>
        <TextField
          name="location"
          label="מיקום"
          value={selectedEvent.location}
          onChange={handleEditEventChange}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          name="organizer"
          label="מארגן"
          value={selectedEvent.organizer}
          onChange={handleEditEventChange}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          name="maxParticipants"
          label="מספר משתתפים מקסימלי"
          value={selectedEvent.maxParticipants}
          onChange={handleEditEventChange}
          type="number"
          InputProps={{ inputProps: { min: 0 } }}
          fullWidth
          helperText="0 = ללא הגבלה"
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          name="imageUrl"
          label="קישור לתמונה"
          value={selectedEvent.imageUrl}
          onChange={handleEditEventChange}
          fullWidth
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          name="description"
          label="תיאור"
          value={selectedEvent.description}
          onChange={handleEditEventChange}
          multiline
          rows={4}
          fullWidth
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={selectedEvent.isPublic}
              onChange={handleEditEventChange}
              name="isPublic"
            />
          }
          label="אירוע פומבי"
        />
        <FormHelperText>
          אירועים פומביים נראים לכל המשתמשים במערכת
        </FormHelperText>
      </Grid>
    </Grid>
  )}
</DialogContent>
<DialogActions>
  <Button 
    onClick={() => setEditDialogOpen(false)} 
    disabled={submitting}
  >
    ביטול
  </Button>
  <Button 
    onClick={() => handleSaveEvent(false)} 
    color="primary" 
    disabled={submitting || !selectedEvent?.title}
    variant="contained"
  >
    {submitting ? <CircularProgress size={24} /> : 'עדכן אירוע'}
  </Button>
</DialogActions>
</Dialog>

{/* דיאלוג מחיקת אירוע */}
<Dialog
open={deleteDialogOpen}
onClose={() => setDeleteDialogOpen(false)}
>
<DialogTitle>מחיקת אירוע</DialogTitle>
<DialogContent>
  <DialogContentText>
    האם אתה בטוח שברצונך למחוק את האירוע "{selectedEvent?.title}"?
    <br />
    פעולה זו אינה ניתנת לביטול.
  </DialogContentText>
</DialogContent>
<DialogActions>
  <Button 
    onClick={() => setDeleteDialogOpen(false)} 
    disabled={submitting}
  >
    ביטול
  </Button>
  <Button 
    onClick={handleDeleteEvent} 
    color="error" 
    disabled={submitting}
    variant="contained"
  >
    {submitting ? <CircularProgress size={24} /> : 'מחק'}
  </Button>
</DialogActions>
</Dialog>

{/* דיאלוג שיתוף אירוע */}
<Dialog
open={shareDialogOpen}
onClose={() => setShareDialogOpen(false)}
fullWidth
>
<DialogTitle>שיתוף אירוע</DialogTitle>
<DialogContent>
  <DialogContentText sx={{ mb: 2 }}>
    בחר קבוצות לשיתוף האירוע "{selectedEvent?.title}"
  </DialogContentText>
  <FormControl fullWidth>
    <InputLabel id="share-groups-label">קבוצות</InputLabel>
    <Select
      labelId="share-groups-label"
      multiple
      value={selectedGroups}
      onChange={handleGroupSelectionChange}
      renderValue={(selected) => {
        const groupNames = selected.map(groupId => {
          const group = availableGroups.find(g => g._id === groupId);
          return group ? group.name : groupId;
        });
        return groupNames.join(', ');
      }}
      label="קבוצות"
    >
      {availableGroups.map((group) => (
        <MenuItem key={group._id} value={group._id}>
          <Box display="flex" alignItems="center">
            {group.name}
            {group.isPrivate && (
              <Chip 
                label="פרטי" 
                size="small" 
                sx={{ ml: 1 }} 
              />
            )}
          </Box>
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</DialogContent>
<DialogActions>
  <Button 
    onClick={() => setShareDialogOpen(false)} 
    disabled={submitting}
  >
    ביטול
  </Button>
  <Button 
    onClick={handleShareEvent} 
    color="primary" 
    disabled={submitting || selectedGroups.length === 0}
    variant="contained"
  >
    {submitting ? <CircularProgress size={24} /> : 'שתף'}
  </Button>
</DialogActions>
</Dialog>
</Box>
);
};

export default EventManagement;