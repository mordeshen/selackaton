import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader,
  Box, 
  Typography, 
  ButtonGroup, 
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Grid,
  Divider
} from '@mui/material';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

/**
 * קומפוננט גרף פעילות - מציג גרף פעילות לפי משתמש, קבוצה או כלל המערכת
 * 
 * @param {Object} props
 * @param {Array} props.data - נתוני הפעילות
 * @param {string} props.title - כותרת הגרף
 * @param {string} props.entityType - סוג הישות (user/group/system)
 * @param {string} props.entityId - מזהה הישות
 * @param {string} props.defaultTimeRange - טווח זמן ברירת מחדל
 * @param {function} props.onTimeRangeChange - callback לשינוי טווח זמן
 * @param {Array} props.metrics - מטריקות להצגה
 */
const ActivityChart = ({
  data = [],
  title = 'גרף פעילות',
  entityType = 'system',
  entityId = null,
  defaultTimeRange = 'week',
  onTimeRangeChange,
  metrics = ['messages', 'activity', 'interactions']
}) => {
  const [timeRange, setTimeRange] = useState(defaultTimeRange);
  const [selectedMetrics, setSelectedMetrics] = useState(metrics.slice(0, 2));
  const [chartType, setChartType] = useState('line');
  
  // מיפוי מטריקות לשמות בעברית וצבעים
  const metricLabels = {
    messages: 'הודעות',
    activity: 'פעילות',
    interactions: 'אינטראקציות',
    alerts: 'התראות',
    responses: 'תגובות',
    newcomers: 'מצטרפים חדשים',
    leavers: 'עוזבים',
    support_requests: 'בקשות תמיכה'
  };
  
  const metricColors = {
    messages: '#2196f3',      // כחול
    activity: '#4caf50',      // ירוק
    interactions: '#ff9800',  // כתום
    alerts: '#f44336',        // אדום
    responses: '#9c27b0',     // סגול
    newcomers: '#00bcd4',     // טורקיז
    leavers: '#795548',       // חום
    support_requests: '#607d8b' // אפור כחלחל
  };
  
  // טיפול בשינוי טווח זמן
  const handleTimeRangeChange = (newRange) => {
    setTimeRange(newRange);
    if (onTimeRangeChange) {
      onTimeRangeChange(newRange);
    }
  };
  
  // טיפול בשינוי מטריקות
  const handleMetricChange = (event) => {
    setSelectedMetrics(event.target.value);
  };
  
  // פורמט תאריך עברי לטולטיפ
  const formatTooltipDate = (date) => {
    if (!date) return '';
    
    // המרה למחרוזת תאריך עברית
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('he-IL', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // יצירת פורמטר מותאם לציר X
  const xAxisDateFormatter = (date) => {
    if (!date) return '';
    
    const dateObj = new Date(date);
    
    switch (timeRange) {
      case 'day':
        return dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      case 'week':
        return dateObj.toLocaleDateString('he-IL', { weekday: 'short' });
      case 'month':
        return dateObj.toLocaleDateString('he-IL', { day: 'numeric' });
      case 'year':
        return dateObj.toLocaleDateString('he-IL', { month: 'short' });
      default:
        return dateObj.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' });
    }
  };
  
  // קאסטומיזציה של טולטיפ
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Card sx={{ boxShadow: 2, maxWidth: 250, border: 'none' }}>
          <CardContent sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {formatTooltipDate(label)}
            </Typography>
            
            {payload.map((entry, index) => (
              <Box key={index} display="flex" alignItems="center" mb={0.5}>
                <Box
                  component="span"
                  sx={{
                    width: 12,
                    height: 12,
                    bgcolor: entry.color,
                    mr: 1,
                    display: 'inline-block'
                  }}
                />
                <Typography variant="body2" component="span">
                  {metricLabels[entry.name] || entry.name}:
                </Typography>
                <Typography variant="body2" component="span" sx={{ fontWeight: 'bold', ml: 0.5 }}>
                  {entry.value}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      );
    }
    
    return null;
  };
  
  // מיפוי נתונים לפי סוג גרף
  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={xAxisDateFormatter} 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(value) => metricLabels[value] || value} />
            
            {selectedMetrics.map((metric) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                name={metric}
                stroke={metricColors[metric] || '#000'}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );
        
      case 'bar':
        return (
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={xAxisDateFormatter} 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(value) => metricLabels[value] || value} />
            
            {selectedMetrics.map((metric) => (
              <Bar
                key={metric}
                dataKey={metric}
                name={metric}
                fill={metricColors[metric] || '#000'}
              />
            ))}
          </BarChart>
        );
        
      default:
        return null;
    }
  };
  
  // חישוב סטטיסטיקות בסיסיות
  const calculateStats = () => {
    if (!data || data.length === 0) return {};
    
    // חישוב ערכים מקסימליים, מינימליים וממוצעים למטריקות הנבחרות
    const stats = {};
    
    selectedMetrics.forEach(metric => {
      const values = data.map(item => item[metric] || 0);
      const sum = values.reduce((acc, val) => acc + val, 0);
      
      stats[metric] = {
        max: Math.max(...values),
        min: Math.min(...values),
        avg: values.length > 0 ? Math.round((sum / values.length) * 10) / 10 : 0,
        total: sum
      };
    });
    
    return stats;
  };
  
  const stats = calculateStats();
  
  // זיהוי מגמת השינוי (עלייה/ירידה)
  const identifyTrend = (metric) => {
    if (!data || data.length < 2) return 'stable';
    
    const first = data[0][metric] || 0;
    const last = data[data.length - 1][metric] || 0;
    
    if (last > first) return 'up';
    if (last < first) return 'down';
    return 'stable';
  };
  
  // קביעת צבע מגמה
  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up': return 'success.main';
      case 'down': return 'error.main';
      default: return 'text.secondary';
    }
  };
  
  // טקסט למגמה
  const getTrendText = (trend, isPositive = true) => {
    switch (trend) {
      case 'up': return isPositive ? 'במגמת עלייה' : 'במגמת עלייה';
      case 'down': return isPositive ? 'במגמת ירידה' : 'במגמת ירידה';
      default: return 'יציב';
    }
  };
  
  // קביעה האם מגמת עלייה היא חיובית (תלוי במטריקה)
  const isTrendPositive = (metric, trend) => {
    const positiveWhenUp = ['messages', 'activity', 'interactions', 'responses', 'newcomers'];
    const positiveWhenDown = ['alerts', 'leavers', 'support_requests'];
    
    if (positiveWhenUp.includes(metric) && trend === 'up') return true;
    if (positiveWhenDown.includes(metric) && trend === 'down') return true;
    
    return false;
};

  return (
    <Card sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        }
        action={
          <Box display="flex" alignItems="center">
            <ButtonGroup size="small" sx={{ mr: 1 }}>
              <Button
                variant={chartType === 'line' ? 'contained' : 'outlined'}
                onClick={() => setChartType('line')}
              >
                קו
              </Button>
              <Button
                variant={chartType === 'bar' ? 'contained' : 'outlined'}
                onClick={() => setChartType('bar')}
              >
                עמודות
              </Button>
            </ButtonGroup>
            
            <ButtonGroup size="small">
              <Button
                variant={timeRange === 'day' ? 'contained' : 'outlined'}
                onClick={() => handleTimeRangeChange('day')}
              >
                יום
              </Button>
              <Button
                variant={timeRange === 'week' ? 'contained' : 'outlined'}
                onClick={() => handleTimeRangeChange('week')}
              >
                שבוע
              </Button>
              <Button
                variant={timeRange === 'month' ? 'contained' : 'outlined'}
                onClick={() => handleTimeRangeChange('month')}
              >
                חודש
              </Button>
              <Button
                variant={timeRange === 'year' ? 'contained' : 'outlined'}
                onClick={() => handleTimeRangeChange('year')}
              >
                שנה
              </Button>
            </ButtonGroup>
          </Box>
        }
        sx={{ pb: 0 }}
      />
      
      <CardContent sx={{ pt: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ width: 200, mt: 1 }}>
            <InputLabel id="metrics-select-label">מטריקות להצגה</InputLabel>
            <Select
              labelId="metrics-select-label"
              id="metrics-select"
              multiple
              value={selectedMetrics}
              onChange={handleMetricChange}
              label="מטריקות להצגה"
              renderValue={(selected) => selected.map(s => metricLabels[s] || s).join(', ')}
            >
              {metrics.map((metric) => (
                <MenuItem key={metric} value={metric}>
                  {metricLabels[metric] || metric}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        <Box sx={{ width: '100%', flexGrow: 1, minHeight: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </Box>
        
        {Object.keys(stats).length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              {selectedMetrics.map((metric) => {
                const trend = identifyTrend(metric);
                const trendIsPositive = isTrendPositive(metric, trend);
                
                return (
                  <Grid item xs={6} md={3} key={metric}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {metricLabels[metric] || metric}
                      </Typography>
                      
                      <Typography variant="h6" component="div" sx={{ my: 0.5 }}>
                        {stats[metric]?.total || 0}
                      </Typography>
                      
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: trendIsPositive ? 'success.main' : 
                                (trend === 'stable' ? 'text.secondary' : 'error.main') 
                        }}
                      >
                        {getTrendText(trend, trendIsPositive)}
                        {trend !== 'stable' && (
                          <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                            (ממוצע: {stats[metric]?.avg || 0})
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityChart;