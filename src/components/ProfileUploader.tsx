import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Camera, Loader2 } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

// ضعي مفتاح ImgBB هنا
const IMGBB_API_KEY = "3cfa3cc628ca9a7bccac6edd73e9286f"; 

export default function ProfileUploader() {
  const { user } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // التحقق من حجم الصورة (أقصى حجم 2 ميجابايت لسرعة الرفع)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("عذراً، يجب أن يكون حجم الصورة أقل من 2 ميجابايت");
      return;
    }

    setIsUploading(true);
    try {
      // 1. تجهيز الصورة للإرسال إلى ImgBB
      const formData = new FormData();
      formData.append("image", file);
      
      // 2. إرسال الصورة إلى سيرفرات ImgBB
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error("فشل الرفع إلى ImgBB");
      }

      // 3. الحصول على الرابط المباشر للصورة
      const imageUrl = data.data.url;

      // 4. تحديث بيانات المستخدم في Firebase Authentication
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: imageUrl });
      }

      // 5. تحديث بيانات المستخدم في قادة بيانات Firestore
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: imageUrl
      });

      toast.success("تم تحديث الصورة الشخصية بنجاح! ✓");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("حدث خطأ أثناء رفع الصورة، يرجى المحاولة لاحقاً.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border border-border rounded-xl bg-card/50">
      <div className="relative">
        <Avatar className="w-24 h-24 border-4 border-background shadow-md">
          <AvatarImage src={(user as any)?.photoURL} className="object-cover" />
          <AvatarFallback className="text-3xl bg-primary/10 text-primary">
            {user?.displayName?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        
        <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform">
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          <Input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleImageUpload} 
            disabled={isUploading || !IMGBB_API_KEY || IMGBB_API_KEY === "YOUR_IMGBB_API_KEY_HERE"}
          />
        </label>
      </div>
      <div className="text-center">
        <p className="font-heading font-bold text-sm">{user?.displayName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">انقري على أيقونة الكاميرا لتغيير صورتك</p>
        
        {(!IMGBB_API_KEY || IMGBB_API_KEY === "YOUR_IMGBB_API_KEY_HERE") && (
          <p className="text-xs text-destructive mt-2 font-bold animate-pulse">
            ⚠️ يرجى إضافة مفتاح ImgBB في الكود لكي يعمل الرفع
          </p>
        )}
      </div>
    </div>
  );
}