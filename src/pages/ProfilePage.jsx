import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Camera, User, LogOut, Edit2, X, Save } from 'lucide-react';

const INTERESTS = [
  { id: 'running', label: '🏃 Running' },
  { id: 'walking', label: '🚶 Walking' },
  { id: 'gym', label: '🏋️ Gym' },
  { id: 'yoga', label: '🧘 Yoga' },
  { id: 'cycling', label: '🚴 Cycling' },
  { id: 'hiking', label: '🥾 Hiking' },
  { id: 'swimming', label: '🏊 Swimming' },
  { id: 'sports', label: '⚽ Sports' }
];

const ACTIVITY_LEVELS = [
  { id: 'beginner', title: '🌱 Beginner', desc: 'Just getting started', color: 'bg-green-100 text-green-800' },
  { id: 'active', title: '⚡ Active', desc: 'I work out regularly', color: 'bg-blue-100 text-blue-800' },
  { id: 'athlete', title: '🏆 Athlete', desc: 'Fitness is my lifestyle', color: 'bg-purple-100 text-purple-800' }
];

const STEP_GOALS = [5000, 8000, 10000];

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit state
  const [editData, setEditData] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setEditData({
          name: data.name || '',
          interests: data.interests || [],
          activityLevel: data.activityLevel || '',
          stepGoal: data.stepGoal || 8000,
          photoURL: data.photoURL || ''
        });
        setPhotoPreview(data.photoURL || null);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handlePhotoChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleInterest = (id) => {
    setEditData(prev => {
      const interests = prev.interests.includes(id) 
        ? prev.interests.filter(i => i !== id)
        : [...prev.interests, id];
      return { ...prev, interests };
    });
  };

  const handleSave = async () => {
    if (!editData.name.trim() || editData.interests.length === 0 || !editData.activityLevel) {
      alert("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      let finalPhotoURL = editData.photoURL;

      if (photoFile) {
        const userId = auth.currentUser.uid;
        const storageRef = ref(storage, `profile-photos/${userId}`);
        const uploadTask = uploadBytesResumable(storageRef, photoFile);

        finalPhotoURL = await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            reject,
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      }

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const updatedData = {
        name: editData.name.trim(),
        interests: editData.interests,
        activityLevel: editData.activityLevel,
        stepGoal: editData.stepGoal,
        photoURL: finalPhotoURL
      };
      
      await updateDoc(userRef, updatedData);
      
      setProfile(prev => ({ ...prev, ...updatedData }));
      setIsEditing(false);
      setPhotoFile(null);
      setUploadProgress(0);

    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-8 px-4 pb-24">
        <div className="max-w-md mx-auto space-y-6 animate-pulse">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 rounded-full w-32"></div>
          </div>
          <div className="flex gap-2 justify-center">
            <div className="h-8 bg-gray-200 rounded-full w-20"></div>
            <div className="h-8 bg-gray-200 rounded-full w-24"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded-xl"></div>
            <div className="h-24 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const activityObj = ACTIVITY_LEVELS.find(lvl => lvl.id === profile?.activityLevel) || ACTIVITY_LEVELS[0];
  const joinedDate = profile?.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Recently';

  const renderDisplayMode = () => (
    <div className="space-y-8 animate-fade-in">
      {/* Top Section */}
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="relative">
          <div className="w-36 h-36 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-gray-400" />
            )}
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">{profile?.name || 'Athlete'}</h1>
          <div className={`inline-flex items-center px-3 py-1 mt-2 rounded-full text-sm font-bold shadow-sm ${activityObj.color}`}>
            {activityObj.title}
          </div>
        </div>
      </div>

      {/* Edit Button */}
      <button 
        onClick={() => setIsEditing(true)}
        className="w-full max-w-xs mx-auto flex items-center justify-center space-x-2 bg-white border-2 border-gray-200 hover:border-green-500 text-gray-700 font-bold py-3 rounded-xl transition-all shadow-sm"
      >
        <Edit2 className="w-5 h-5" />
        <span>Edit Profile</span>
      </button>

      {/* Interests */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Interests</h2>
        <div className="flex flex-wrap gap-2">
          {profile?.interests?.map(interestId => {
            const interest = INTERESTS.find(i => i.id === interestId);
            if (!interest) return null;
            return (
              <span key={interest.id} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-semibold border border-green-100">
                {interest.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black text-[#22c55e] mb-1">{profile?.stepGoal?.toLocaleString() || '8,000'}</span>
          <span className="text-xs font-bold text-gray-500 uppercase">Daily Steps</span>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-bold text-gray-800 mb-1">{joinedDate}</span>
          <span className="text-xs font-bold text-gray-500 uppercase">Member Since</span>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="pt-6 border-t border-gray-200">
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center justify-center space-x-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3.5 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  const renderEditMode = () => (
    <div className="space-y-8 animate-fade-in bg-white p-6 rounded-3xl shadow-lg border border-gray-100 mb-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
        <button onClick={() => setIsEditing(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 1. PHOTO */}
      <div className="flex flex-col items-center space-y-4 pt-4">
        <label className="relative cursor-pointer group">
          <div className="w-28 h-28 rounded-full border-4 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 group-hover:bg-gray-100 transition-colors">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-gray-400" />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </label>
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}
      </div>

      {/* 2. NAME */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Display Name</label>
        <input
          type="text"
          value={editData.name}
          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      </div>

      {/* 3. INTERESTS */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Interests</label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => {
            const isSelected = editData.interests.includes(interest.id);
            return (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isSelected ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {interest.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. ACTIVITY LEVEL */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Activity Level</label>
        <div className="grid grid-cols-1 gap-2">
          {ACTIVITY_LEVELS.map((level) => {
            const isSelected = editData.activityLevel === level.id;
            return (
              <button
                key={level.id}
                onClick={() => setEditData({ ...editData, activityLevel: level.id })}
                className={`p-3 rounded-xl text-left border-2 transition-all ${
                  isSelected ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-green-200'
                }`}
              >
                <div className="font-bold text-gray-900">{level.title}</div>
                <div className="text-xs text-gray-500">{level.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. STEP GOAL */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Daily Step Goal</label>
        <div className="flex gap-2">
          {STEP_GOALS.map((goal) => {
            const isSelected = editData.stepGoal === goal;
            return (
              <button
                key={goal}
                onClick={() => setEditData({ ...editData, stepGoal: goal })}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  isSelected ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {goal.toLocaleString()}
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex space-x-3 pt-4 border-t border-gray-100">
        <button
          onClick={() => setIsEditing(false)}
          className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3.5 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 flex items-center justify-center space-x-2 transition-colors disabled:opacity-70"
        >
          {saving ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save</span>
            </>
          )}
        </button>
      </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 px-4 pt-8">
      <div className="max-w-md mx-auto">
        {isEditing ? renderEditMode() : renderDisplayMode()}
      </div>
    </div>
  );
}
