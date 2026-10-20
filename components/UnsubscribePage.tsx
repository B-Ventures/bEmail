import React, { useEffect, useState } from 'react';
import { getPublicAudience, saveUnsubscribeRequest, PublicForm } from '../services/firebase';

// Public one-click unsubscribe page: ?action=unsubscribe&listId=..&sid=..&t=..
const UnsubscribePage: React.FC = () => {
    const [form, setForm] = useState<PublicForm | null>(null);
    const [status, setStatus] = useState<'loading' | 'confirm' | 'working' | 'done' | 'error' | 'invalid'>('loading');
    const params = new URLSearchParams(window.location.search);
    const listId = params.get('listId') || '';
    const sid = params.get('sid') || '';
    const token = params.get('t') || '';

    useEffect(() => {
        if (!listId || !sid || !/^[a-f0-9]{16}$/.test(token)) { setStatus('invalid'); return; }
        getPublicAudience(listId)
            .then(f => { if (f) { setForm(f); setStatus('confirm'); } else setStatus('invalid'); })
            .catch(() => setStatus('error'));
    }, []);

    const confirm = async () => {
        if (!form) return;
        setStatus('working');
        try {
            await saveUnsubscribeRequest(form, sid, token);
            setStatus('done');
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    const card = (children: React.ReactNode) => (
        <div className="min-h-screen w-full bg-brand-dark flex items-center justify-center p-4" dir="rtl">
            <div className="max-w-md w-full bg-brand-medium border border-brand-border p-8 rounded-2xl shadow-2xl text-center">
                {children}
            </div>
        </div>
    );

    if (status === 'loading' || status === 'working') {
        return card(<div className="animate-spin h-8 w-8 border-2 border-brand-red border-t-transparent rounded-full mx-auto"></div>);
    }
    if (status === 'invalid') {
        return card(<>
            <h1 className="text-2xl font-bold text-white mb-2">الرابط غير صالح</h1>
            <p className="text-brand-subtext" dir="ltr">This unsubscribe link is invalid or incomplete.</p>
        </>);
    }
    if (status === 'error') {
        return card(<>
            <h1 className="text-2xl font-bold text-white mb-2">صار خطأ، جرّب مرة ثانية</h1>
            <p className="text-brand-subtext" dir="ltr">Something went wrong. Please try again.</p>
        </>);
    }
    if (status === 'done') {
        return card(<>
            <h1 className="text-2xl font-bold text-white mb-2">تم إلغاء اشتراكك ✓</h1>
            <p className="text-brand-subtext mb-1">ما رح توصلك إيميلات من «{form?.name}» بعد اليوم.</p>
            <p className="text-brand-subtext text-sm" dir="ltr">You've been unsubscribed.</p>
        </>);
    }
    return card(<>
        <h1 className="text-2xl font-bold text-white mb-2">إلغاء الاشتراك</h1>
        <p className="text-brand-subtext mb-6">متأكد إنك بدك توقف إيميلات «{form?.name}»؟</p>
        <button onClick={confirm} className="w-full py-3 bg-brand-red text-white font-bold rounded-lg hover:opacity-90 transition">نعم، ألغِ اشتراكي</button>
        <p className="text-brand-subtext text-xs mt-4" dir="ltr">Unsubscribe from this list</p>
    </>);
};

export default UnsubscribePage;
