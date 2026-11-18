
import React from 'react';
import { X, LogIn, KeyRound, UserPlus } from 'lucide-react';

interface Props {
    onClose: () => void;
}

export const LoginGuide: React.FC<Props> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white">Login Help / लॉगिन सहायता</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-full cursor-pointer"><X size={20} /></button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex gap-4">
                        <div className="bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 p-3 rounded-xl h-fit"><LogIn size={24} /></div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">Login कैसे करें?</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                अपना <strong>Email</strong> या <strong>Mobile Number</strong> डालें और अपना पासवर्ड डालें। फिर Login बटन दबाएं।
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 p-3 rounded-xl h-fit"><KeyRound size={24} /></div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">पासवर्ड भूल गए?</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                नीचे दिए गए <strong>"Forgot Password?"</strong> बटन पर क्लिक करें। अपना मोबाइल नंबर डालें और रिकवरी सवाल का जवाब दें।
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 p-3 rounded-xl h-fit"><UserPlus size={24} /></div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">नया अकाउंट?</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                अगर आपका अकाउंट नहीं है, तो <strong>"Create Account"</strong> पर क्लिक करें। बस अपना नाम, मोबाइल और जानकारी भरें।
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center">
                    <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold text-sm cursor-pointer">OK, समझ गया</button>
                </div>
            </div>
        </div>
    );
};
