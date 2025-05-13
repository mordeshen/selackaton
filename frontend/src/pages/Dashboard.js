import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent,
  Divider,
  Button,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// קומפוננטות מותאמות
import UserCard from '../components/userCard';
import GroupList from '../components/GroupList';
import ActivityChart from '../components/ActivityChart';
import AlertPanel from '../components/AlertPanel';

// שירותים
import apiService from '../services/api';
import realtimeService from '../services/realtime';

/**
 * דף דשבורד ראשי - מציג סקירה כללית של המערכת
 */
const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // נתוני דשבורד
  const [dashboardData, setDashboardData] = useState(null);
  const [usersAtRisk, setUsersAtRisk] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [activeGroups, setActiveGroups] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [activityData, setActivityData] = useState([]);
  
  // מצב טעינה
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // טאבים
  const [tabValue, setTabValue] = useState(0);
  
  useEffect(() => {
    // טעינת נתוני דשבורד
    fetchDashboardData();
    
    // הרשמה לעדכונים בזמן אמת
    const alertListener = realtimeService.onNewAlert((alertData) => {
      // עדכון התראות חדשות
      setRecentAlerts(prev => [alertData, ...prev.slice(0, 9)]);
      
      // עדכון מונה התראות
      setDashboardData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          alertsCount: prev.alertsCount + 1,
          unreadAlertsCount: prev.unreadAlertsCount + 1
        };
      });
    });
    
    const userStatusListener = realtimeService.onUserStatusChange((userData) => {
      // עדכון משתמשים בסיכון
      if (userData.status === 'risk') {
        // בדיקה אם המשתמש כבר קיים ברשימה
        setUsersAtRisk(prev => {
          const exists = prev.some(user => user._id === userData.userId);
          if (!exists) {
            return [...prev, userData];
          }
          return prev.map(user => 
            user._id === userData.userId ? { ...user, ...userData } : user
          );
        });
      } else {
        // הסרת משתמש מהרשימה אם הוא כבר לא בסיכון
        setUsersAtRisk(prev => 
          prev.filter(user => user._id !== userData.userId)
        );
      }
    });
    
    // עדכון נתונים כל 5 דקות
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    
    // ניקוי בעת פירוק הקומפוננטה
    return () => {
      alertListener(); // ביטול האזנה להתראות
      userStatusListener(); // ביטול האזנה לשינויי מצב משתמש
      clearInterval(interval); // ניקוי טיימר עדכון
    };
  }, []);
  
  /**
   * טעינת נתוני דשבורד מה-API
   */
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // שליפת נתוני דשבורד כלליים
      const data = await apiService.analytics.getDashboardData();
      setDashboardData(data);
      
      // שליפת משתמשים בסיכון
      const riskUsers = await apiService.users.getAll({ status: 'risk', limit: 5 });
      setUsersAtRisk(riskUsers.data || []);
      
      // שליפת התראות אחרונות
      const alerts = await apiService.alerts.getAll({ limit: 10, sort: '-createdAt' });
      setRecentAlerts(alerts.data || []);
      
      // שליפת קבוצות פעילות
      const groups = await apiService.groups.getAll({ status: 'active', sort: '-lastActivity', limit: 5 });
      setActiveGroups(groups.data || []);
      
      // שליפת אירועים קרובים
      const events = await apiService.events.getAll({ upcoming: true, limit: 5 });
      setUpcomingEvents(events.data || []);
      
      // שליפת נתוני פעילות
      const activity = await apiService.analytics.getSystemStats({ 
        period: 'week',
        metrics: ['messages', 'activity', 'alerts', 'newcomers']
      });
      setActivityData(activity.data || []);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('אירעה שגיאה בטעינת נתוני הדשבורד. אנא נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  /**
   * רענון נתוני דשבורד
   */
  const handleRefresh = () => {
    fetchDashboardData();
  };
  
  /**
   * טיפול בשינוי טאב
   */
  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };
  
  /**
   * טיפול בהפעלת התראה
   */
  const handleAlertAction = (alert, action) => {
    switch (action) {
      case 'markAllRead':
        apiService.alerts.markAllAsRead()
          .then(() => {
            setRecentAlerts(prev => 
              prev.map(alert => ({ ...alert, isRead: true }))
            );
            
            // עדכון מונה התראות שלא נקראו
            setDashboardData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                unreadAlertsCount: 0
              };
            });
          })
          .catch(err => {
            console.error('Error marking alerts as read:', err);
          });
        break;
        
      case 'view':
        // לוגיקה לצפייה בפרטי התראה
        console.log('View alert:', alert);
        break;
        
      default:
        break;
    }
  };
  
  /**
   * טיפול בסימון התראה כנקראה
   */
  const handleAlertDismiss = (alert) => {
    apiService.alerts.markAsRead(alert._id)
      .then(() => {
        // עדכון התראה ברשימה
        setRecentAlerts(prev => 
          prev.map(a => 
            a._id === alert._id ? { ...a, isRead: true } : a
          )
        );
        
        // עדכון מונה התראות שלא נקראו
        setDashboardData(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            unreadAlertsCount: Math.max(0, prev.unreadAlertsCount - 1)
          };
        });
      })
      .catch(err => {
        console.error('Error marking alert as read:', err);
      });
  };
  
  /**
   * טיפול בבחירת קבוצה
   */
  const handleGroupSelect = (group) => {
    console.log('Group selected:', group);
    // ניתן להוסיף ניווט לדף הקבוצה
    // history.push(`/groups/${group._id}`);
  };
  
  /**
   * טיפול ביצירת קשר עם משתמש
   */
  const handleContactUser = (user) => {
    console.log('Contact user:', user);
    // לוגיקה ליצירת קשר עם משתמש
  };
  
  // קטגוריות לטאבים
  const categories = [
    { label: 'סקירה כללית', icon: <DashboardIcon /> },
    { label: 'משתמשים במצוקה', icon: <WarningIcon /> },
    { label: 'התראות מערכת', icon: <NotificationsIcon /> },
    { label: 'קבוצות פעילות', icon: <GroupIcon /> },
  ];
  
  // כרטיסי סטטיסטיקה
  const statsCards = [
    {
      title: 'משתמשים פעילים',
      icon: <PersonIcon fontSize="large" color="primary" />,
      value: dashboardData?.activeUsers || 0,
      change: dashboardData?.usersChange || 0,
      color: 'primary.main',
      secondaryText: `סה"כ ${dashboardData?.totalUsers || 0} משתמשים`
    },
    {
      title: 'קבוצות פעילות',
      icon: <GroupIcon fontSize="large" color="success" />,
      value: dashboardData?.activeGroups || 0,
      change: dashboardData?.groupsChange || 0,
      color: 'success.main',
      secondaryText: `ממוצע ${dashboardData?.avgUsersPerGroup || 0} משתמשים לקבוצה`
    },
    {
      title: 'הודעות היום',
      icon: <NotificationsIcon fontSize="large" color="error" />,
      value: dashboardData?.dailyMessages || 0,
      unread: dashboardData?.unreadAlertsCount || 0,
      color: 'error.main',
      secondaryText: `${dashboardData?.weeklyMessages || 0} בשבוע האחרון`
    },
    {
      title: 'פעילויות השבוע',
      icon: <EventIcon fontSize="large" color="info" />,
      value: dashboardData?.weeklyActivities || 0,
      upcoming: dashboardData?.upcomingEventsCount || 0,
      color: 'info.main',
      secondaryText: `${dashboardData?.totalParticipants || 0} משתתפים`
    }
  ];
  
  // אם בטעינה, הצג אינדיקטור טעינה
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          דשבורד ניהול מערכת
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outlined"
        >
          {refreshing ? 'מרענן...' : 'רענן נתונים'}
        </Button>
      </Box>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography>{error}</Typography>
        </Paper>
      )}
      
      {/* כרטיסי סטטיסטיקה */}
      <Grid container spacing={3} mb={3}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {card.value.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                    
                    {card.change !== undefined && (
                      <Box display="flex" alignItems="center" mt={1}>
                        {card.change > 0 ? (
                          <TrendingUpIcon fontSize="small" color="success" />
                        ) : card.change < 0 ? (
                          <TrendingDownIcon fontSize="small" color="error" />
                        ) : null}
                        <Typography 
                          variant="caption" 
                          color={card.change > 0 ? 'success.main' : card.change < 0 ? 'error.main' : 'text.secondary'}
                          sx={{ mr: 0.5 }}
                        >
                          {Math.abs(card.change)}% {card.change > 0 ? 'עלייה' : card.change < 0 ? 'ירידה' : ''}
                        </Typography>
                      </Box>
                    )}
                    
                    {card.secondaryText && (
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        {card.secondaryText}
                      </Typography>
                    )}
                  </Box>
                  <Box 
                    sx={{ 
                      backgroundColor: `${card.color}15`, 
                      p: 1.5, 
                      borderRadius: '50%' 
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* טאבים לתצוגה מובייל */}
      {isMobile && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={tabValue}
            onChange={handleChangeTab}
            variant="scrollable"
            scrollButtons="auto"
          >
            {categories.map((category, index) => (
              <Tab 
                key={index}
                icon={category.icon} 
                label={category.label} 
                id={`tab-${index}`}
                aria-controls={`tabpanel-${index}`}
              />
            ))}
          </Tabs>
        </Box>
      )}
      
      {/* תוכן עבור תצוגת מובייל (לפי טאב) */}
      {isMobile && (
        <Box role="tabpanel" hidden={tabValue !== 0} id="tabpanel-0">
          {tabValue === 0 && (
            <Box>
              {/* גרף פעילות - מובייל */}
              <Box mt={2} mb={3}>
                <ActivityChart 
                  data={activityData}
                  title="פעילות מערכת שבועית"
                  entityType="system"
                  defaultTimeRange="week"
                  metrics={['messages', 'activeUsers']}
                />
              </Box>
              
              {/* אירועים קרובים - מובייל */}
              {upcomingEvents.length > 0 && (
                <Box mt={3}>
                  <Typography variant="h6" component="h2" fontWeight="bold" mb={2}>
                    אירועים קרובים
                  </Typography>
                  <Grid container spacing={2}>
                    {upcomingEvents.slice(0, 2).map((event, index) => (
                      <Grid item xs={12} key={index}>
                        <Card>
                          <CardContent>
                            <Box display="flex" alignItems="center">
                              <Box 
                                sx={{ 
                                  backgroundColor: 'info.light', 
                                  p: 1, 
                                  borderRadius: '4px',
                                  minWidth: 40,
                                  textAlign: 'center',
                                  mr: 2
                                }}
                              >
                                <Typography fontWeight="bold" color="info.contrastText">
                                  {new Date(event.date).toLocaleDateString('he-IL', { day: 'numeric' })}
                                </Typography>
                                <Typography variant="caption" color="info.contrastText">
                                  {new Date(event.date).toLocaleDateString('he-IL', { month: 'short' })}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="subtitle1" component="div" fontWeight="bold">
                                  {event.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {event.location || 'מיקום לא ידוע'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  {new Date(event.date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
      
      {/* תוכן עבור תצוגת דסקטופ */}
      {!isMobile && (
        <Grid container spacing={3}>
          {/* גרף פעילות - דסקטופ */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  פעילות שבועית
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={dashboardData?.activityHistory || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="messages" stroke="#8884d8" name="הודעות" />
                    <Line type="monotone" dataKey="activeUsers" stroke="#82ca9d" name="משתמשים פעילים" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          
          {/* משתמשים בסיכון - דסקטופ */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 0, pb: 0 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" component="h2" fontWeight="bold">
                    משתמשים במצוקה
                  </Typography>
                  <Chip 
                    label={`${usersAtRisk.length} משתמשים`}
                    color="error"
                    size="small"
                  />
                </Box>
              </CardContent>
              <Divider sx={{ my: 1.5 }} />
              <CardContent sx={{ flexGrow: 1, pt: 0, overflow: 'auto' }}>
                {usersAtRisk.length === 0 ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body1">אין משתמשים במצוקה כרגע</Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {usersAtRisk.map((user, index) => (
                      <Grid item xs={12} key={index}>
                        <UserCard 
                          user={{...user, status: 'risk'}} 
                          onContact={handleContactUser}
                          onMessage={() => console.log('message user', user)}
                          onViewDetails={() => console.log('view details', user)}
                          compact={true}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* התראות מערכת - דסקטופ */}
          <Grid item xs={12} md={6}>
            <AlertPanel 
              alerts={recentAlerts}
              onAlertAction={handleAlertAction}
              onAlertDismiss={handleAlertDismiss}
              showHeader={true}
              maxAlerts={5}
            />
          </Grid>
          
          {/* קבוצות פעילות - דסקטופ */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 0, pb: 0 }}>
                <Typography variant="h6" component="h2" fontWeight="bold">
                  קבוצות פעילות
                </Typography>
              </CardContent>
              <Divider sx={{ my: 1.5 }} />
              <CardContent sx={{ flexGrow: 1, pt: 0, px: 0, overflow: 'auto' }}>
                <GroupList 
                  groups={activeGroups}
                  onGroupSelect={handleGroupSelect}
                  onGroupMessage={(group) => console.log('message group', group)}
                  onGroupManage={(group) => console.log('manage group', group)}
                  showFilters={false}
                />
              </CardContent>
            </Card>
          </Grid>
          
          {/* אירועים קרובים - דסקטופ */}
          {upcomingEvents.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="h6" component="h2" fontWeight="bold">
                    אירועים קרובים
                  </Typography>
                </CardContent>
                <Divider sx={{ mb: 1 }} />
                <CardContent sx={{ pt: 1 }}>
                  <Grid container spacing={2}>
                    {upcomingEvents.map((event, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="center">
                              <Box 
                                sx={{ 
                                  backgroundColor: 'info.light', 
                                  p: 1, 
                                  borderRadius: '4px',
                                  minWidth: 40,
                                  textAlign: 'center',
                                  mr: 2
                                }}
                              >
                                <Typography fontWeight="bold" color="info.contrastText">
                                  {new Date(event.date).toLocaleDateString('he-IL', { day: 'numeric' })}
                                </Typography>
                                <Typography variant="caption" color="info.contrastText">
                                  {new Date(event.date).toLocaleDateString('he-IL', { month: 'short' })}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="subtitle1" component="div" fontWeight="bold">
                                  {event.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {event.location || 'מיקום לא ידוע'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  {new Date(event.date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;