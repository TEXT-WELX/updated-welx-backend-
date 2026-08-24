const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        category: { type: String, default: "General", index: true },
        duration: { type: String, default: "" },
        level: { type: String, default: "beginner" },
        price: { type: Number, default: 0 },
        rating: { type: Number, default: 4.5 },
        students: { type: Number, default: 0 },
        instructor: { type: String, default: "Expert Instructor" },
        image: { type: String, default: "" },
        modules: [
            {
                id: Number,
                title: String,
                description: String,
                lessons: [
                    {
                        id: Number,
                        title: String,
                        type: { type: String, enum: ["video", "reading"] },
                        duration: String,
                        videoUrl: String,
                        content: String,
                    },
                ],
            },
        ],
        // New fields for enhanced functionality
        quizRequired: { type: Boolean, default: true }, // Whether quiz is required for completion
        certificateEnabled: { type: Boolean, default: true }, // Whether certificate is available
        skills: [{ type: String }], // Skills taught in this course
        prerequisites: [{ type: String }], // Course prerequisites
        tags: [{ type: String }], // Course tags for search/filtering
        totalLessons: { type: Number, default: 0 },
        estimatedHours: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Index for better search performance
courseSchema.index({ title: "text", description: "text", tags: "text" });
courseSchema.index({ level: 1, rating: -1 });
courseSchema.index({ price: 1, rating: -1 });

module.exports = mongoose.model("Course", courseSchema);
