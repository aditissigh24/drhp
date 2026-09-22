import { FC } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface SuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuccessDialog: FC<SuccessDialogProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className="flex flex-col items-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </motion.div>
            <DialogTitle className="text-xl">Registration Successful!</DialogTitle>
            <DialogDescription className="text-center">
              Your account has been created successfully. Please login to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-center">
            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
              Proceed to Login
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}; 