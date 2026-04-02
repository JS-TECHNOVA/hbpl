'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Search } from 'lucide-react';

const HBPL_Examportal = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            HBPL Exam Portal
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-12">
            Register for the competitive exam or check your result below.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Link
              href="/exam-portal/register"
              className="group flex flex-col items-center gap-4 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl border-2 border-transparent hover:border-blue-500 transition-all duration-300"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors duration-300">
                <FileText className="w-8 h-8 text-blue-600 dark:text-blue-300 group-hover:text-white transition-colors duration-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Register for Exam</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Submit your basic details to register
                </p>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Link
              href="/exam-portal/result"
              className="group flex flex-col items-center gap-4 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl border-2 border-transparent hover:border-green-500 transition-all duration-300"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center group-hover:bg-green-500 transition-colors duration-300">
                <Search className="w-8 h-8 text-green-600 dark:text-green-300 group-hover:text-white transition-colors duration-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Check Result</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Enter roll number and DOB to view your result
                </p>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HBPL_Examportal;
