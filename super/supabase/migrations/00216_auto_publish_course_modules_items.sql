-- Migration: 00216_auto_publish_course_modules_items.sql
-- Purpose: Add triggers to automatically publish new modules and items if the parent course is already published.

-- 1. Create or replace trigger function for master_course_modules
CREATE OR REPLACE FUNCTION auto_publish_module_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  parent_status text;
BEGIN
  -- Check parent course status
  SELECT publish_status INTO parent_status FROM master_courses WHERE id = NEW.master_course_id;
  
  IF parent_status = 'published' THEN
    NEW.publish_status := 'published';
    NEW.visible_to_students := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for master_course_modules
DROP TRIGGER IF EXISTS trg_auto_publish_module_on_insert ON master_course_modules;
CREATE TRIGGER trg_auto_publish_module_on_insert
  BEFORE INSERT ON master_course_modules
  FOR EACH ROW
  EXECUTE FUNCTION auto_publish_module_on_insert();


-- 2. Create or replace trigger function for master_course_items
CREATE OR REPLACE FUNCTION auto_publish_item_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  parent_status text;
BEGIN
  -- Check parent course status
  SELECT publish_status INTO parent_status FROM master_courses WHERE id = NEW.master_course_id;
  
  IF parent_status = 'published' THEN
    NEW.publish_status := 'published';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for master_course_items
DROP TRIGGER IF EXISTS trg_auto_publish_item_on_insert ON master_course_items;
CREATE TRIGGER trg_auto_publish_item_on_insert
  BEFORE INSERT ON master_course_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_publish_item_on_insert();
