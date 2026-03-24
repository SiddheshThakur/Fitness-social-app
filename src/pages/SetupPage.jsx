import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Camera, User } from 'lucide-react';
import useToast from '../hooks/useToast';

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
  { id: 'beginner', title: '🌱 Beginner', desc: 'Just getting started' },
  { id: 'active', title: '⚡ Active', desc: 'I work out regularly' },
  { id: 'athlete', title: '🏆 Athlete', desc: 'Fitness is my lifestyle' }
];

const STEP_GOALS = [5000, 8000, 10000];

export default function SetupPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [name, setName] = useState('');
  const [interests, setInterests] = useState([]);
  const [activityLevel, setActivityLevel] = useState('');
  const [stepGoal, setStepGoal] = useState(8000);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleInterest = (id) => {
    if (interests.includes(id)) {
      setInterests(interests.filter(i => i !== id));
    } else {
      setInterests([...interests, id]);
    }
  };

  const handleSave = async () => {
    setError('');
    
    // Validations
    if (!name.trim()) return setError('Please tell us your name.');
    if (interests.length === 0) return setError('Please select at least one interest.');
    if (!activityLevel) return setError('Please select your activity level.');
    if (!auth.currentUser) return setError('You must be logged in to save your profile.');

    setSaving(true);
    let photoURL = '';

    try {
      // 1. Upload Photo if selected
      if (photoFile) {
        const userId = auth.currentUser.uid;
        const storageRef = ref(storage, `profile-photos/${userId}`);
        const uploadTask = uploadBytesResumable(storageRef, photoFile);

        photoURL = await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
        showToast("Photo uploaded! ✓", "success");
      }

      // 2. Save Data to Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        uid: auth.currentUser.uid,
        name: name.trim(),
        photoURL,
        interests,
        activityLevel,
        stepGoal,
        createdAt: serverTimestamp()
      });

      // 3. Navigate
      showToast("Profile saved! 🎉", "success");
      navigate('/dashboard');

    } catch (err) {
      console.error(err);
      setError('Failed to save profile. Please try again.');
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-20 px-4 pt-8">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-gray-900">Set up your profile</h1>
            <span className="text-sm font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">
              Step 1 of 1
            </span>
          </div>
          <p className="text-gray-500 text-lg">Let's customize your StrideSocial experience.</p>
        </div>

        {/* 1. PROFILE PHOTO */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">1. Profile Photo</h2>
          <div className="flex flex-col items-center space-y-4">
            <label className="relative cursor-pointer group">
              <div className="w-40 h-40 rounded-full border-4 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 group-hover:bg-gray-100 transition-colors shadow-inner">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-gray-400" />
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-10 h-10 text-white animate-bounce" />
                </div>
              </div>
              <input type="file" id="photo-upload" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5">
                <div className="bg-[#22c55e] h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
            <p className="text-sm font-bold text-gray-500 bg-gray-100 px-4 py-2 rounded-full">Tap photo to upload</p>
          </div>
        </section>

        {/* 2. YOUR NAME */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">2. Your Name</h2>
          <div className="space-y-2">
            <label className="block text-base font-semibold text-gray-800">
              What should we call you? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors shadow-sm text-lg"
              placeholder="Your full name or nickname"
              required
            />
          </div>
        </section>

        {/* 3. YOUR INTERESTS */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">3. Your Interests</h2>
          <div className="space-y-3">
            <label className="block text-base font-semibold text-gray-800">
              What do you love doing? <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {INTERESTS.map((interest) => {
                const isSelected = interests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`px-4 py-3 min-h-[44px] rounded-xl font-bold transition-all duration-200 ${
                      isSelected 
                        ? 'bg-[#22c55e] text-white shadow-md transform scale-105' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {interest.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. ACTIVITY LEVEL */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">4. Activity Level</h2>
          <div className="space-y-3">
            <label className="block text-base font-semibold text-gray-800">
              How active are you? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ACTIVITY_LEVELS.map((level) => {
                const isSelected = activityLevel === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setActivityLevel(level.id)}
                    className={`p-4 rounded-xl text-left border-2 transition-all duration-200 ${
                      isSelected 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-100 bg-gray-50 hover:border-green-200'
                    }`}
                  >
                    <div className="font-bold text-gray-900 text-lg mb-1">{level.title}</div>
                    <div className="text-sm text-gray-600">{level.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. STEP GOAL */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">5. Step Goal</h2>
          <div className="space-y-3">
            <label className="block text-base font-semibold text-gray-800">
              Daily step goal
            </label>
            <div className="flex gap-3">
              {STEP_GOALS.map((goal) => {
                const isSelected = stepGoal === goal;
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setStepGoal(goal)}
                    className={`flex-1 py-4 min-h-[44px] rounded-2xl font-black transition-all duration-200 ${
                      isSelected 
                        ? 'bg-[#22c55e] text-white shadow-lg' 
                        : 'bg-gray-100 text-gray-600 hover:border-green-200 border border-transparent'
                    }`}
                  >
                    {goal.toLocaleString()}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium border border-red-200 animate-pulse">
            {error}
          </div>
        )}

        {/* SAVE BUTTON */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#22c55e] hover:bg-green-600 text-white font-black text-xl py-4 rounded-2xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center transform hover:-translate-y-1 mt-4"
        >
          {saving ? (
            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Start my journey 🚀"
          )}
        </button>
      </div>
    </div>
  );
}
