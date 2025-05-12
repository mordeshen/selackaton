// frontend/src/pages/GroupManagement.js
import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, Box, TextField, Button, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Edit, Delete, PersonAdd, Message, Assignment } from '@mui/icons-material';
import { getGroups, createGroup, updateGroup, deleteGroup } from '../services/api';
import MembersList from '../components/MembersList';
import GroupActivityChart from '../components/GroupActivityChart';
import GroupCreationForm from '../components/GroupCreationForm';

const GroupManagement = () => {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    // סינון קבוצות לפי מחרוזת חיפוש
    if (searchTerm.trim() === '') {
      setFilteredGroups(groups);
    } else {
      const filtered = groups.filter(group => 
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredGroups(filtered);
    }
  }, [searchTerm, groups]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const groupsData = await getGroups();
      setGroups(groupsData);
      setFilteredGroups(groupsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
  };

  const handleCreateGroup = async (groupData) => {
    try {
      await createGroup(groupData);
      setCreateDialogOpen(false);
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      // הצגת הודעת שגיאה
    }
  };

  const handleUpdateGroup = async (groupData) => {
    try {
      await updateGroup(selectedGroup._id, groupData);
      setEditDialogOpen(false);
      fetchGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      // הצגת הודעת שגיאה
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הקבוצה?')) {
      try {
        await deleteGroup(groupId);
        fetchGroups();
        if (selectedGroup && selectedGroup._id === groupId) {
          setSelectedGroup(null);
        }
      } catch (error) {
        console.error('Error deleting group:', error);
        // הצגת הודעת שגיאה
      }
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  return (
    <Container maxWidth="xl">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          ניהול קבוצות
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {/* חיפוש וסינון */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="חיפוש קבוצות"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={6} container justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PersonAdd />}
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    יצירת קבוצה חדשה
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* רשימת קבוצות */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                רשימת קבוצות ({filteredGroups.length})
              </Typography>
              {loading ? (
                <Typography>טוען נתונים...</Typography>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>שם הקבוצה</TableCell>
                      <TableCell>חברים</TableCell>
                      <TableCell>פעילות</TableCell>
                      <TableCell>פעולות</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredGroups.map(group => (
                      <TableRow 
                        key={group._id} 
                        onClick={() => handleGroupSelect(group)}
                        selected={selectedGroup && selectedGroup._id === group._id}
                        hover
                      >
                        <TableCell>{group.name}</TableCell>
                        <TableCell>{group.members.length}</TableCell>
                        <TableCell>
                          {/* מדד ויזואלי לרמת פעילות */}
                          <Box 
                            width="100%" 
                            height={10} 
                            bgcolor="#e0e0e0" 
                            borderRadius={5}
                          >
                            <Box 
                              width={`${Math.min(group.metrics.activityLevel * 100, 100)}%`} 
                              height={10} 
                              bgcolor={group.metrics.activityLevel > 0.5 ? "#4caf50" : "#ff9800"} 
                              borderRadius={5}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGroup(group);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group._id);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* פרטי הקבוצה הנבחרת */}
        <Grid item xs={12} md={7}>
          {selectedGroup ? (
            <Card>
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                  {selectedGroup.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {selectedGroup.description}
                </Typography>
                
                <Box my={2}>
                  <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="חברי קבוצה" />
                    <Tab label="פעילות ומדדים" />
                    <Tab label="ניהול" />
                  </Tabs>
                </Box>
                
                {tabValue === 0 && (
                  <MembersList 
                    members={selectedGroup.members} 
                    groupId={selectedGroup._id} 
                    onUpdate={fetchGroups}
                  />
                )}
                
                {tabValue === 1 && (
                  <GroupActivityChart groupId={selectedGroup._id} />
                )}
                
                {tabValue === 2 && (
                  <Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<Message />}
                          onClick={() => {/* פונקציה לשליחת הודעה */}}
                        >
                          שליחת הודעה לקבוצה
                        </Button>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<Assignment />}
                          onClick={() => {/* פונקציה להצעת פעילות */}}
                        >
                          הצעת פעילות
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Typography>בחר קבוצה מהרשימה כדי לצפות בפרטים</Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
      
      {/* דיאלוג יצירת קבוצה */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>יצירת קבוצה חדשה</DialogTitle>
        <DialogContent>
          <GroupCreationForm onSubmit={handleCreateGroup} />
        </DialogContent>
      </Dialog>
      
      {/* דיאלוג עריכת קבוצה */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>עריכת קבוצה</DialogTitle>
        <DialogContent>
          {selectedGroup && (
            <GroupCreationForm 
              initialData={selectedGroup}
              onSubmit={handleUpdateGroup} 
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default GroupManagement;