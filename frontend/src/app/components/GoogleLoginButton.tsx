'use client';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function GoogleLoginButton() {
  const router = useRouter();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post('http://localhost:8000/api/v1/auth/google/', {
          access_token: tokenResponse.access_token, // <-- send access_token
        });

        localStorage.setItem('access_token', res.data.access);
        localStorage.setItem('refresh_token', res.data.refresh);

        console.log('Login Success:', res.data);
        // redirect after login
        router.push('/'); 
      } catch (error) {
        console.error('Login Failed:', error);
      }
    },
    flow: 'implicit', // <-- use implicit flow for access token directly
  });

  return (
    <button
      onClick={() => login()}
      className="flex items-center justify-center w-full gap-3 rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
    >
      <img
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google"
        className="w-5 h-5"
      />
      <span>Sign in with Google</span>
    </button>
  );
}
